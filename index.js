#!/usr/bin/env node

const { Command } = require('commander');
const { execSync } = require('child_process');
const { readFileSync } = require('fs');

const program = new Command();

program
  .version('1.0.0')
  .description('CLI Tool for Testing SDKs');

program
  .option('-f, --file <path>', 'path to the test file')
  .option('-l, --language <type>', 'programming language of the SDK (java, python, typescript)');

const executeCommand = (command) => {
  try {
    const output = execSync(command, { stdio: 'inherit' });
    console.log(output.toString());
  } catch (err) {
    console.error(`Error executing command: ${command}`, err.message);
  }
};

const executeJavaTests = (file) => {
  console.log(`Executing Java tests for file: ${file}`);
  executeCommand(`javac ${file} && java ${file.replace('.java', '')}`);
};

const executePythonTests = (file) => {
  console.log(`Executing Python tests for file: ${file}`);
  executeCommand(`python ${file}`);
};

const executeTypeScriptTests = (file) => {
  console.log(`Executing TypeScript tests for file: ${file}`);
  executeCommand(`tsc ${file} && node ${file.replace('.ts', '.js')}`);
};

program
  .command('test')
  .description('Test the SDK')
  .action(() => {
    const { file, language } = program.opts();
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
