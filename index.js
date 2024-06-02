#!/usr/bin/env node

const { Command } = require('commander');
const { execSync, spawnSync } = require('child_process');
const { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } = require('fs');
const path = require('path');

const program = new Command();

program
  .version('1.0.0')
  .description('CLI Tool for Testing SDKs and Building WebAssembly')
  .option('-f, --file <path>', 'path to the source file')
  .option('-l, --language <type>', 'programming language of the source file (java, python, typescript)');

const executeCommand = (command, args = [], options = {}) => {
  try {
    const result = spawnSync(command, args, { stdio: 'inherit', shell: true, ...options });
    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(`Command failed with exit code ${result.status}: ${command} ${args.join(' ')}`);
    }
  } catch (err) {
    console.error(`Error executing command: ${command} ${args.join(' ')}\n`, err.message);
  }
};

const preprocessCFile = (filePath) => {
  let content = readFileSync(filePath, 'utf8');
  content = content.replace(/^#include <io\.h>$/m, '#ifndef __EMSCRIPTEN__\n#include <io.h>\n#endif');
  writeFileSync(filePath, content, 'utf8');
};

const findCFiles = (dir) => {
  let cFiles = [];
  const files = readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (file.endsWith('.c')) {
      cFiles.push(fullPath);
    } else if (statSync(fullPath).isDirectory()) {
      cFiles = cFiles.concat(findCFiles(fullPath));
    }
  });
  return cFiles;
};

const getNuitkaIncludePath = () => {
  const includePath = execSync('python -c "import nuitka; import os; print(os.path.dirname(nuitka.__file__))"').toString().trim();
  return path.join(includePath, 'build', 'include');
};

const getPythonIncludePath = () => {
  return execSync('python -c "from sysconfig import get_paths as gp; print(gp()[\'include\'])"').toString().trim();
};

const convertPythonToWasm = (file) => {
  console.log(`Converting Python file to WebAssembly: ${file}`);
  const fileNameWithoutExtension = path.basename(file, path.extname(file));
  const buildDir = path.join(path.dirname(file), 'build');
  const intermediateBuildDir = path.join(buildDir, `${fileNameWithoutExtension}.build`);
  const outputWasmFile = path.join(buildDir, `${fileNameWithoutExtension}.wasm`);

  try {
    // Ensure the build directory exists
    if (!existsSync(buildDir)) {
      mkdirSync(buildDir, { recursive: true });
    }

    // Compile Python to C using Nuitka with MinGW64 Clang
    executeCommand('python', ['-m', 'nuitka', '--module', '--mingw64', '--clang', '--output-dir=' + buildDir, file]);

    // Debugging output to check where the C files are placed
    console.log(`Looking for C files in directory: ${intermediateBuildDir}`);
    const cFiles = findCFiles(intermediateBuildDir);
    console.log(`Found C files: ${cFiles.join(', ')}`);
    if (cFiles.length === 0) {
      throw new Error(`C source files not found in: ${intermediateBuildDir}`);
    }

    // Preprocess the generated C files to handle platform-specific includes
    cFiles.forEach(file => preprocessCFile(file));

    const nuitkaIncludePath = getNuitkaIncludePath();
    const pythonIncludePath = getPythonIncludePath();

    // Set up environment variables for Emscripten
    const emscriptenEnv = {
      ...process.env,
      PATH: `C:/Brunt-jam/clang+llvm-18.1.6-x86_64-pc-windows-msvc/clang+llvm-18.1.6-x86_64-pc-windows-msvc/bin;C:/Brunt-jam/emsdk/upstream/emscripten;C:/Brunt-jam/emsdk/node/18.20.3_64bit/bin;${process.env.PATH}`
    };

    // Add Windows Kit and Visual Studio include paths
    const windowsKitIncludePath = 'C:/Program Files (x86)/Windows Kits/10/Include/10.0.22621.0/ucrt';
    const visualStudioIncludePath = 'C:/Program Files/Microsoft Visual Studio/2022/Community/VC/Tools/MSVC/14.40.33807/include';

    // Compile the generated C files to WebAssembly using Emscripten
    const emccArgs = [
      ...cFiles,
      '-o', outputWasmFile,
      `-I"${nuitkaIncludePath}"`,
      `-I"${pythonIncludePath}"`,
      `-I"${windowsKitIncludePath}"`,
      `-I"${visualStudioIncludePath}"`,
      '-s', 'EXPORTED_FUNCTIONS=["_execute_credit_leg","_execute_debit_leg","_http_request"]',
      '-s', 'EXPORTED_RUNTIME_METHODS=["ccall","cwrap"]',
      '-fdeclspec', 
      '-fms-extensions'
    ];

    console.log(`Running emcc command: emcc ${emccArgs.join(' ')}`);
    executeCommand('emcc', emccArgs, { env: emscriptenEnv });

    console.log(`Successfully converted ${file} to WebAssembly at ${outputWasmFile}`);
  } catch (err) {
    console.error(`Error converting Python to WebAssembly: ${err.message}`);
  }
};

const convertToWasm = (file, language) => {
  console.log(`Converting ${language} file to WebAssembly: ${file}`);
  switch (language.toLowerCase()) {
    case 'java':
      // Ensure you have jwebassembly or equivalent tool installed
      executeCommand('javac', [file]);
      executeCommand('java', ['-jar', 'jwebassembly-cli.jar', file, '-o', `${path.basename(file, path.extname(file))}.wasm`]);
      break;
    case 'python':
      convertPythonToWasm(file);
      break;
    case 'typescript':
      // Ensure you have AssemblyScript installed
      executeCommand('asc', [file, '-b', `${path.basename(file, path.extname(file))}.wasm`, '-t', `${path.basename(file, path.extname(file))}.wat`]);
      break;
    default:
      console.error(`Unsupported language for WebAssembly conversion: ${language}`);
  }
};

const executeJavaTests = (file) => {
  console.log(`Executing Java tests for file: ${file}`);
  try {
    console.log("Compiling Java sources with Maven...");
    execSync('mvn compile', { stdio: 'inherit' });
    const className = file.replace('src/main/java/', '').replace('.java', '').replace(/\//g, '.');
    console.log(`Running Java class: ${className}`);
    execSync(`mvn exec:java -Dexec.mainClass="${className}"`, { stdio: 'inherit' });
  } catch (err) {
    console.error(`Error executing Java tests: ${err.message}`);
  }
};

const executePythonTests = (file) => {
  console.log(`Executing Python tests for file: ${file}`);
  executeCommand('python', [file]);
};

const executeTypeScriptTests = (file) => {
  console.log(`Executing TypeScript tests for file: ${file}`);
  const outDir = path.resolve(process.cwd(), 'dist');
  const jsFile = path.join(outDir, path.basename(file).replace('.ts', '.js'));
  mkdirSync(outDir, { recursive: true });
  const tscCommand = 'tsc --outDir ' + outDir + ' ' + file;
  console.log(`Running command: ${tscCommand}`);
  executeCommand('tsc', ['--outDir', outDir, file]);
  const nodeCommand = 'node ' + jsFile;
  console.log(`Running command: ${nodeCommand}`);
  executeCommand('node', [jsFile]);
};

program
  .command('build')
  .description('Build a source file into WebAssembly')
  .action(() => {
    const options = program.opts();
    const { file, language } = options;
    if (!file) {
      console.error('Please provide a source file using the -f option.');
      process.exit(1);
    }
    if (!language) {
      console.error('Please provide a programming language using the -l option.');
      process.exit(1);
    }

    convertToWasm(file, language);
  });

program
  .command('test')
  .description('Test the SDK')
  .action(() => {
    const options = program.opts();
    const { file, language } = options;
    if (!file) {
      console.error('Please provide a test file using the -f option.');
      process.exit(1);
    }
    if (!language) {
      console.error('Please provide a programming language using the -l option.');
      process.exit(1);
    }

    switch (language.toLowerCase()) {
      case 'java':
        executeJavaTests(file);
        break;
      case 'python':
        executePythonTests(file);
        break;
      case 'typescript':
        executeTypeScriptTests(file);
        break;
      case 'wasm':
        // Assuming this function should be handled correctly
        break;
      default:
        console.error(`Unsupported language. Please choose java, python, typescript, or wasm.`);
    }
  });

program.parse(process.argvs)