#!/usr/bin/env node

const { Command } = require('commander');
const { execSync } = require('child_process');
const { mkdirSync } = require('fs');
const { readFileSync } = require('fs');
const path = require('path');
const { WASI } = require('wasi');
const { WebAssembly } = require('vm');



const program = new Command();

program
  .version('1.0.0')
  .description('CLI Tool for Testing SDKs')
  .option('-f, --file <path>', 'path to the test file')
  .option('-l, --language <type>', 'programming language of the SDK (java, python, typescript)');

const executeCommand = (command) => {
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (err) {
    console.error(`Error executing command: ${command}\n`, err.message);
  }
};

const executeWasm = (file) => {
  console.log(`Executing WASM file: ${file}`);

  const wasi = new WASI({
      args: [file],
      env: process.env,
      preopens: {
          '/sandbox': path.dirname(file)  
      }
  });

  const wasmBuffer = readFileSync(file);
  const wasmModule = new WebAssembly.Module(wasmBuffer);

  
  const instance = new WebAssembly.Instance(wasmModule, {
      wasi_snapshot_preview1: wasi.wasiImport
  });

  wasi.start(instance);
};


const executeJavaTests = (file) => {
    console.log(`Executing Java tests for file: ${file}`);
  
    // Assuming the Maven project is in the current working directory
    try {
      // Running Maven compile phase
      console.log("Compiling Java sources with Maven...");
      execSync('mvn compile', { stdio: 'inherit' });
  
      // Building the package name and class from the file path
      const className = file.replace('src/main/java/', '').replace('.java', '').replace(/\//g, '.');
      console.log(`Running Java class: ${className}`);
      
      // Maven exec plugin to run the Java class
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
  
    // Assuming the output directory for the compiled JS is in 'dist'
    const outDir = path.resolve(process.cwd(), 'dist');
    const jsFile = path.join(outDir, path.basename(file).replace('.ts', '.js'));
  
    // Create output directory if it doesn't exist
    mkdirSync(outDir, { recursive: true });
  
    // Compilation command
    const tscCommand = `tsc --outDir ${outDir} ${file}`;
    console.log(`Running command: ${tscCommand}`);
    executeCommand(tscCommand);
  
    // Execution command
    const nodeCommand = `node ${jsFile}`;
    console.log(`Running command: ${nodeCommand}`);
    executeCommand(nodeCommand);
  };
  

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
        executeWasm(file);
        break;
      default:
        console.error(`Unsupported language. Please choose java, python, typescript, or wasm.`);
    }
  });

program.parse(process.argv);
