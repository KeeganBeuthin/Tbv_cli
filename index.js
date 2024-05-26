#!/usr/bin/env node

const { Command } = require('commander');
const { execSync } = require('child_process');
const { mkdirSync, readFileSync, writeFileSync, existsSync } = require('fs');
const path = require('path');

const program = new Command();

program
  .version('1.0.0')
  .description('CLI Tool for Testing SDKs and Building WebAssembly')
  .option('-f, --file <path>', 'path to the source file')
  .option('-l, --language <type>', 'programming language of the source file (java, python, typescript)');

const executeCommand = (command) => {
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (err) {
    console.error(`Error executing command: ${command}\n`, err.message);
  }
};

const convertPythonToWasm = (file) => {
  console.log(`Converting Python file to WebAssembly: ${file}`);
  const fileNameWithoutExtension = path.basename(file, path.extname(file));
  const outputWasmFile = path.join(path.dirname(file), `${fileNameWithoutExtension}.wasm`);
  const cFile = path.join(path.dirname(file), `${fileNameWithoutExtension}.c`);

  try {
    // Write setup.py for Cython
    const setupPyContent = `
from setuptools import setup
from Cython.Build import cythonize

setup(
    ext_modules=cythonize("${file}")
)
    `;
    const setupPyFile = path.join(path.dirname(file), 'setup.py');
    writeFileSync(setupPyFile, setupPyContent);

    // Run Cython to generate C file
    executeCommand(`python ${setupPyFile} build_ext --inplace`);

    // Check if the C file was generated
    if (!existsSync(cFile)) {
      throw new Error(`C file not found: ${cFile}`);
    }

    // Compile the generated C file to WebAssembly using Emscripten
    const emccCommand = `emcc ${cFile} -o ${outputWasmFile} -s EXPORTED_FUNCTIONS='["_execute_credit_leg", "_execute_debit_leg", "_http_request"]' -s EXTRA_EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]'`;
    executeCommand(emccCommand);

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
      executeCommand(`javac ${file} && java -jar jwebassembly-cli.jar ${file} -o ${path.basename(file, path.extname(file))}.wasm`);
      break;
    case 'python':
      convertPythonToWasm(file);
      break;
    case 'typescript':
      // Ensure you have AssemblyScript installed
      executeCommand(`asc ${file} -b ${path.basename(file, path.extname(file))}.wasm -t ${path.basename(file, path.extname(file))}.wat`);
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
  executeCommand(`python ${file}`);
};

const executeTypeScriptTests = (file) => {
  console.log(`Executing TypeScript tests for file: ${file}`);
  const outDir = path.resolve(process.cwd(), 'dist');
  const jsFile = path.join(outDir, path.basename(file).replace('.ts', '.js'));
  mkdirSync(outDir, { recursive: true });
  const tscCommand = `tsc --outDir ${outDir} ${file}`;
  console.log(`Running command: ${tscCommand}`);
  executeCommand(tscCommand);
  const nodeCommand = `node ${jsFile}`;
  console.log(`Running command: ${nodeCommand}`);
  executeCommand(nodeCommand);
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
