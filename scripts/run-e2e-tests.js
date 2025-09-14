#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * E2E Test Runner Script
 * 
 * This script provides a comprehensive way to run different test suites
 * with various configurations for the AIrium application.
 */

// Test suite configurations
const testSuites = {
  smoke: [
    'auth.spec.ts',
    'app-access.spec.ts'
  ],
  
  regression: [
    'auth.spec.ts',
    'app-access.spec.ts',
    'admin-management.spec.ts',
    'voice-chat.spec.ts',
    'media-management.spec.ts',
    'responsive-design.spec.ts',
    'security-validation.spec.ts',
    'performance-optimization.spec.ts'
  ],
  
  performance: [
    'performance-optimization.spec.ts',
    'performance-monitoring.spec.ts'
  ],
  
  security: [
    'security-validation.spec.ts',
    'auth.spec.ts'
  ],
  
  mobile: [
    'responsive-design.spec.ts',
    'auth.spec.ts',
    'voice-chat.spec.ts'
  ],
  
  integration: [
    'integration-complete.spec.ts'
  ],
  
  all: [
    'auth.spec.ts',
    'app-access.spec.ts',
    'admin-management.spec.ts',
    'voice-chat.spec.ts',
    'media-management.spec.ts',
    'responsive-design.spec.ts',
    'security-validation.spec.ts',
    'performance-optimization.spec.ts',
    'performance-monitoring.spec.ts',
    'integration-complete.spec.ts'
  ]
};

// Environment configurations
const environments = {
  dev: {
    baseURL: 'http://localhost:4321',
    timeout: 60000
  },
  staging: {
    baseURL: 'https://staging.devposthackathon.tojf.link',
    timeout: 90000
  },
  prod: {
    baseURL: 'https://devposthackathon.tojf.link',
    timeout: 120000
  }
};

// Browser configurations
const browsers = {
  chromium: ['chromium-desktop'],
  firefox: ['firefox-desktop'],
  webkit: ['webkit-desktop'],
  mobile: ['mobile-chrome', 'mobile-safari'],
  tablet: ['tablet-chrome'],
  all: ['chromium-desktop', 'firefox-desktop', 'webkit-desktop', 'mobile-chrome', 'mobile-safari', 'tablet-chrome']
};

function parseArguments() {
  const args = process.argv.slice(2);
  const config = {
    suite: 'smoke',
    environment: 'dev',
    browser: 'chromium',
    headed: false,
    debug: false,
    parallel: true,
    retries: 1,
    workers: 4,
    reporter: 'html',
    outputDir: 'test-results',
    grep: null,
    timeout: null,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--suite':
      case '-s':
        config.suite = nextArg;
        i++;
        break;
      case '--environment':
      case '--env':
      case '-e':
        config.environment = nextArg;
        i++;
        break;
      case '--browser':
      case '-b':
        config.browser = nextArg;
        i++;
        break;
      case '--headed':
        config.headed = true;
        break;
      case '--debug':
        config.debug = true;
        config.headed = true;
        config.parallel = false;
        config.workers = 1;
        break;
      case '--no-parallel':
        config.parallel = false;
        break;
      case '--retries':
        config.retries = parseInt(nextArg) || 1;
        i++;
        break;
      case '--workers':
        config.workers = parseInt(nextArg) || 4;
        i++;
        break;
      case '--reporter':
        config.reporter = nextArg;
        i++;
        break;
      case '--output-dir':
        config.outputDir = nextArg;
        i++;
        break;
      case '--grep':
        config.grep = nextArg;
        i++;
        break;
      case '--timeout':
        config.timeout = parseInt(nextArg);
        i++;
        break;
      case '--help':
      case '-h':
        config.help = true;
        break;
      default:
        if (arg.startsWith('--')) {
          console.warn(`Unknown option: ${arg}`);
        }
        break;
    }
  }

  return config;
}

function showHelp() {
  console.log(`
AIrium E2E Test Runner

Usage: node scripts/run-e2e-tests.js [options]

Options:
  --suite, -s <suite>        Test suite to run (default: smoke)
                             Available: ${Object.keys(testSuites).join(', ')}
  
  --environment, --env, -e   Environment to test against (default: dev)
                             Available: ${Object.keys(environments).join(', ')}
  
  --browser, -b <browser>    Browser(s) to test (default: chromium)
                             Available: ${Object.keys(browsers).join(', ')}
  
  --headed                   Run tests in headed mode (default: headless)
  --debug                    Run in debug mode (headed, no parallel, 1 worker)
  --no-parallel              Disable parallel execution
  
  --retries <number>         Number of retries for failed tests (default: 1)
  --workers <number>         Number of worker processes (default: 4)
  --reporter <reporter>      Test reporter (default: html)
  --output-dir <dir>         Output directory for results (default: test-results)
  --grep <pattern>           Only run tests matching pattern
  --timeout <ms>             Global timeout in milliseconds
  
  --help, -h                 Show this help message

Examples:
  # Run smoke tests on development environment
  node scripts/run-e2e-tests.js --suite smoke --env dev

  # Run full regression suite on staging with multiple browsers
  node scripts/run-e2e-tests.js --suite regression --env staging --browser all

  # Run performance tests in debug mode
  node scripts/run-e2e-tests.js --suite performance --debug

  # Run specific test pattern
  node scripts/run-e2e-tests.js --grep "voice chat" --browser chromium

  # Run mobile tests
  node scripts/run-e2e-tests.js --suite mobile --browser mobile
`);
}

function validateConfig(config) {
  const errors = [];

  if (!testSuites[config.suite]) {
    errors.push(`Invalid test suite: ${config.suite}. Available: ${Object.keys(testSuites).join(', ')}`);
  }

  if (!environments[config.environment]) {
    errors.push(`Invalid environment: ${config.environment}. Available: ${Object.keys(environments).join(', ')}`);
  }

  if (!browsers[config.browser]) {
    errors.push(`Invalid browser: ${config.browser}. Available: ${Object.keys(browsers).join(', ')}`);
  }

  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }
}

function buildPlaywrightCommand(config) {
  const env = environments[config.environment];
  const testFiles = testSuites[config.suite];
  const browserProjects = browsers[config.browser];

  let command = 'npx playwright test';

  // Add test files
  if (testFiles && testFiles.length > 0) {
    command += ` ${testFiles.map(file => `e2e/${file}`).join(' ')}`;
  }

  // Add projects (browsers)
  if (browserProjects && browserProjects.length > 0) {
    browserProjects.forEach(project => {
      command += ` --project="${project}"`;
    });
  }

  // Add configuration options
  if (config.headed) {
    command += ' --headed';
  }

  if (config.debug) {
    command += ' --debug';
  }

  if (!config.parallel) {
    command += ' --workers=1';
  } else if (config.workers !== 4) {
    command += ` --workers=${config.workers}`;
  }

  if (config.retries !== 1) {
    command += ` --retries=${config.retries}`;
  }

  if (config.reporter !== 'html') {
    command += ` --reporter=${config.reporter}`;
  }

  if (config.outputDir !== 'test-results') {
    command += ` --output=${config.outputDir}`;
  }

  if (config.grep) {
    command += ` --grep="${config.grep}"`;
  }

  if (config.timeout) {
    command += ` --timeout=${config.timeout}`;
  }

  return {
    command,
    env: {
      ...process.env,
      BASE_URL: env.baseURL,
      TIMEOUT: env.timeout.toString(),
      CI: process.env.CI || 'false'
    }
  };
}

function ensureDirectories(config) {
  const dirs = [
    config.outputDir,
    `${config.outputDir}/html-report`,
    `${config.outputDir}/artifacts`,
    `${config.outputDir}/allure-results`
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

function runTests(config) {
  console.log('🚀 Starting AIrium E2E Tests');
  console.log('================================');
  console.log(`Suite: ${config.suite}`);
  console.log(`Environment: ${config.environment} (${environments[config.environment].baseURL})`);
  console.log(`Browser: ${config.browser}`);
  console.log(`Mode: ${config.headed ? 'headed' : 'headless'}`);
  console.log(`Parallel: ${config.parallel ? 'enabled' : 'disabled'}`);
  console.log(`Workers: ${config.workers}`);
  console.log(`Retries: ${config.retries}`);
  console.log('================================\n');

  ensureDirectories(config);

  const { command, env } = buildPlaywrightCommand(config);
  
  console.log(`Executing: ${command}\n`);

  try {
    const startTime = Date.now();
    
    execSync(command, {
      stdio: 'inherit',
      env,
      cwd: process.cwd()
    });

    const duration = Date.now() - startTime;
    console.log(`\n✅ Tests completed successfully in ${(duration / 1000).toFixed(2)}s`);
    
    // Show results location
    console.log(`\n📊 Test Results:`);
    console.log(`  HTML Report: ${config.outputDir}/html-report/index.html`);
    console.log(`  JSON Results: ${config.outputDir}/results.json`);
    console.log(`  JUnit XML: ${config.outputDir}/results.xml`);

  } catch (error) {
    console.error('\n❌ Tests failed');
    console.error(`Exit code: ${error.status}`);
    
    if (fs.existsSync(`${config.outputDir}/html-report/index.html`)) {
      console.log(`\n📊 Test Report: ${config.outputDir}/html-report/index.html`);
    }
    
    process.exit(error.status || 1);
  }
}

function main() {
  const config = parseArguments();

  if (config.help) {
    showHelp();
    return;
  }

  validateConfig(config);
  runTests(config);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  testSuites,
  environments,
  browsers,
  parseArguments,
  buildPlaywrightCommand,
  runTests
};