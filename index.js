#!/usr/bin/env node

const { Command } = require('commander');
const { execSync } = require('child_process');
const { existsSync, mkdirSync, readdirSync } = require('fs');
const path = require('path');

const program = new Command();

program
  .version('1.0.0')
  .description('CLI Tool for Testing SDKs and Building WebAssembly')
  .option('-f, --file <path>', 'path to the source file')
  .option('-l, --language <type>', 'programming language of the source file (java, python, typescript)');

const executeCommand = (command, args = []) => {
  try {
    execSync([command, ...args].join(' '), { stdio: 'inherit' });
  } catch (err) {
    console.error(`Error executing command: ${command} ${args.join(' ')}\n`, err.message);
  }
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

    // Compile Python to C using Nuitka
    executeCommand('python', ['-m', 'nuitka', '--module', '--output-dir=' + buildDir, file]);

    const cFiles = readdirSync(intermediateBuildDir).filter(file => file.endsWith('.c'));
    if (cFiles.length === 0) {
      throw new Error(`C source files not found in: ${intermediateBuildDir}`);
    }

    // Compile the generated C files to WebAssembly using Emscripten
    const emccArgs = [
      ...cFiles.map(file => path.join(intermediateBuildDir, file)),
      '-o', outputWasmFile,
      '-s', 'EXPORTED_FUNCTIONS=["_execute_credit_leg","_execute_debit_leg","_http_request"]',
      '-s', 'EXPORTED_RUNTIME_METHODS=["ccall","cwrap"]'
    ];
    executeCommand('emcc', emccArgs);

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

program.parse(process.argv);
