#!/usr/bin/env node

// Minimal deployment script to bypass TypeScript issues
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting minimal Amplify deployment...');

// Create a minimal backend configuration
const minimalBackend = `
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { storage } from './storage/resource.js';

const backend = defineBackend({
  auth,
  data,
  storage,
});

export { backend };
`;

// Write the minimal backend
import { writeFileSync } from 'fs';
writeFileSync(join(__dirname, 'amplify', 'backend-minimal.ts'), minimalBackend);

// Run the deployment
const deployProcess = spawn('npx', ['ampx', 'sandbox', '--once'], {
  stdio: 'inherit',
  cwd: __dirname
});

deployProcess.on('close', (code) => {
  console.log(`Deployment process exited with code ${code}`);
  process.exit(code);
});