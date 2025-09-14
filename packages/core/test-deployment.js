#!/usr/bin/env node

// Test script to verify Amplify configuration
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Testing Amplify Core Module Configuration...');

// Test 1: Check if auth resource exists
try {
  const authPath = join(__dirname, 'amplify', 'auth', 'resource.ts');
  const authContent = readFileSync(authPath, 'utf8');
  console.log('✓ Auth resource configuration found');
} catch (error) {
  console.log('✗ Auth resource configuration missing:', error.message);
}

// Test 2: Check if data resource exists
try {
  const dataPath = join(__dirname, 'amplify', 'data', 'resource.ts');
  const dataContent = readFileSync(dataPath, 'utf8');
  console.log('✓ Data resource configuration found');
} catch (error) {
  console.log('✗ Data resource configuration missing:', error.message);
}

// Test 3: Check if storage resource exists
try {
  const storagePath = join(__dirname, 'amplify', 'storage', 'resource.ts');
  const storageContent = readFileSync(storagePath, 'utf8');
  console.log('✓ Storage resource configuration found');
} catch (error) {
  console.log('✗ Storage resource configuration missing:', error.message);
}

// Test 4: Check backend configuration
try {
  const backendPath = join(__dirname, 'amplify', 'backend.ts');
  const backendContent = readFileSync(backendPath, 'utf8');
  console.log('✓ Backend configuration found');
  
  // Check if it imports the basic resources
  if (backendContent.includes('auth') && backendContent.includes('data') && backendContent.includes('storage')) {
    console.log('✓ Backend imports basic resources');
  } else {
    console.log('✗ Backend missing basic resource imports');
  }
} catch (error) {
  console.log('✗ Backend configuration missing:', error.message);
}

// Test 5: Check package.json
try {
  const packagePath = join(__dirname, 'package.json');
  const packageContent = JSON.parse(readFileSync(packagePath, 'utf8'));
  
  if (packageContent.dependencies['@aws-amplify/backend']) {
    console.log('✓ Amplify backend dependency found');
  } else {
    console.log('✗ Amplify backend dependency missing');
  }
} catch (error) {
  console.log('✗ Package.json check failed:', error.message);
}

console.log('\nConfiguration test completed.');
console.log('If all tests pass, the basic Amplify setup should work.');