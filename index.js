#!/usr/bin/env node

const { Command } = require('commander');
const { execSync } = require('child_process');
const { mkdirSync } = require('fs');
const path = require('path');

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

const executeJavaTests = (file) => {
    console.log(`Executing Java tests for file: ${file}`);
  
    // Assuming the out directory is at 'src/com/out'
    const outDir = path.resolve(process.cwd(), 'src/com/out');
  
    // Create output directory if it doesn't exist
    mkdirSync(outDir, { recursive: true });
  
    // Compilation command
    const javacCommand = `javac -d ${outDir} ${file}`;
    console.log(`Running command: ${javacCommand}`);
    executeCommand(javacCommand);
  
    // Extract the package and class name automatically
    const packageName = 'com.java.transactions'; // Since package structure is known
    const className = path.basename(file, '.java'); // Extract class name from file name
  
    // Execution command
    const javaCommand = `java -cp ${outDir} ${packageName}.${className}`;
    console.log(`Running command: ${javaCommand}`);
    executeCommand(javaCommand);
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
      default:
        console.error('Unsupported language. Please choose java, python, or typescript.');
    }
  });

program.parse(process.argv);
