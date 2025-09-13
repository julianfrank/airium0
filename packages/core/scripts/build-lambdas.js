#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const lambdaFunctionsDir = path.join(__dirname, '../lib/lambda-functions');
const lambdaDirs = fs.readdirSync(lambdaFunctionsDir).filter(dir => {
  const dirPath = path.join(lambdaFunctionsDir, dir);
  return fs.statSync(dirPath).isDirectory() && fs.existsSync(path.join(dirPath, 'package.json'));
});

console.log('Building Lambda functions...');

lambdaDirs.forEach(dir => {
  const lambdaPath = path.join(lambdaFunctionsDir, dir);
  console.log(`Building ${dir}...`);
  
  try {
    // Install dependencies
    execSync('npm ci', { cwd: lambdaPath, stdio: 'inherit' });
    
    // Compile TypeScript if tsconfig exists
    const tsconfigPath = path.join(lambdaPath, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      execSync('npx tsc', { cwd: lambdaPath, stdio: 'inherit' });
    }
    
    console.log(`✅ ${dir} built successfully`);
  } catch (error) {
    console.error(`❌ Failed to build ${dir}:`, error.message);
    process.exit(1);
  }
});

console.log('All Lambda functions built successfully!');