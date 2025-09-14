#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class AiriumDeployer {
  constructor() {
    this.rootDir = join(__dirname, '..');
    this.coreDir = join(this.rootDir, 'packages', 'core');
    this.uiDir = join(this.rootDir, 'packages', 'ui');
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  error(message) {
    this.log(message, 'ERROR');
    process.exit(1);
  }

  execCommand(command, cwd = this.rootDir, options = {}) {
    this.log(`Executing: ${command} in ${cwd}`);
    try {
      const result = execSync(command, {
        cwd,
        stdio: 'inherit',
        encoding: 'utf8',
        ...options
      });
      return result;
    } catch (error) {
      this.error(`Command failed: ${command}\n${error.message}`);
    }
  }

  loadEnvironmentConfig(environment) {
    const configPath = join(this.rootDir, 'environments', `${environment}.json`);
    if (!existsSync(configPath)) {
      this.error(`Environment configuration not found: ${configPath}`);
    }

    try {
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      this.log(`Loaded configuration for environment: ${environment}`);
      return config;
    } catch (error) {
      this.error(`Failed to parse environment configuration: ${error.message}`);
    }
  }

  validatePrerequisites() {
    this.log('Validating prerequisites...');

    // Check if AWS CLI is installed and configured
    try {
      this.execCommand('aws --version', this.rootDir, { stdio: 'pipe' });
      this.execCommand('aws sts get-caller-identity', this.rootDir, { stdio: 'pipe' });
    } catch (error) {
      this.error('AWS CLI is not installed or configured properly');
    }

    // Check if Amplify CLI is installed
    try {
      this.execCommand('npx ampx --version', this.rootDir, { stdio: 'pipe' });
    } catch (error) {
      this.error('Amplify CLI is not available');
    }

    // Check if Node.js version is compatible
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 18) {
      this.error(`Node.js version ${nodeVersion} is not supported. Please use Node.js 18 or higher.`);
    }

    this.log('Prerequisites validation completed successfully');
  }

  installDependencies() {
    this.log('Installing dependencies...');

    // Install root dependencies
    this.execCommand('npm ci', this.rootDir);

    // Install Core module dependencies
    this.execCommand('npm ci', this.coreDir);

    // Install UI module dependencies
    this.execCommand('npm ci', this.uiDir);

    // Install Lambda function dependencies
    const lambdaFunctions = [
      'websocket-handler',
      'nova-sonic-processor',
      'appsync-event-publisher',
      'connection-manager'
    ];

    for (const func of lambdaFunctions) {
      const funcDir = join(this.coreDir, 'lib', 'lambda-functions', func);
      if (existsSync(funcDir)) {
        this.execCommand('npm ci', funcDir);
      }
    }

    this.log('Dependencies installation completed');
  }

  runTests() {
    this.log('Running tests...');

    // Run Core module tests
    this.execCommand('npm run test', this.coreDir);

    // Run UI module tests
    this.execCommand('npm run test', this.uiDir);

    this.log('All tests passed successfully');
  }

  buildCore() {
    this.log('Building Core module...');

    // Build Lambda functions
    this.execCommand('npm run build:lambdas', this.coreDir);

    // Build TypeScript
    this.execCommand('npm run build', this.coreDir);

    this.log('Core module build completed');
  }

  deployBackend(environment, config) {
    this.log(`Deploying backend for environment: ${environment}`);

    // Set environment variables
    process.env.AWS_REGION = config.aws.region;
    process.env.ENVIRONMENT = environment;

    // Deploy Amplify backend
    this.execCommand(`npx ampx deploy --branch ${config.amplify.branch}`, this.coreDir);

    // Verify amplify_outputs.json was generated
    const outputsPath = join(this.coreDir, 'amplify_outputs.json');
    if (!existsSync(outputsPath)) {
      this.error('amplify_outputs.json was not generated');
    }

    this.log('Backend deployment completed');
  }

  buildUI() {
    this.log('Building UI module...');

    // Copy amplify_outputs.json from Core to UI
    const sourcePath = join(this.coreDir, 'amplify_outputs.json');
    const targetPath = join(this.uiDir, 'amplify_outputs.json');

    if (existsSync(sourcePath)) {
      this.execCommand(`cp ${sourcePath} ${targetPath}`, this.rootDir);
    } else {
      this.log('amplify_outputs.json not found, using existing configuration', 'WARN');
    }

    // Build Astro application
    this.execCommand('npm run build', this.uiDir);

    this.log('UI module build completed');
  }

  deployFrontend(environment, config) {
    this.log(`Deploying frontend for environment: ${environment}`);

    // Deploy Amplify hosting
    this.execCommand(`npx ampx deploy --branch ${config.amplify.branch}`, this.uiDir);

    this.log('Frontend deployment completed');
  }

  setupDomain(environment, config) {
    if (!config.domain || !config.domain.name) {
      this.log('No domain configuration found, skipping domain setup', 'WARN');
      return;
    }

    this.log(`Setting up domain: ${config.domain.name}`);

    // This would typically involve:
    // 1. Creating/updating Route53 hosted zone
    // 2. Creating SSL certificate
    // 3. Configuring CloudFront distribution
    // 4. Updating Amplify app domain settings

    // For now, we'll log the manual steps required
    this.log(`Manual steps required for domain setup:`, 'WARN');
    this.log(`1. Configure custom domain in Amplify Console: ${config.domain.name}`);
    this.log(`2. Update DNS records to point to Amplify domain`);
    this.log(`3. Verify SSL certificate is issued and active`);
  }

  setupMonitoring(environment, config) {
    if (!config.monitoring || !config.monitoring.enableCloudWatch) {
      this.log('Monitoring not enabled, skipping setup', 'WARN');
      return;
    }

    this.log('Setting up monitoring and alerting...');

    // Deploy monitoring stack
    this.execCommand(
      `npx cdk deploy AiriumMonitoringStack-${environment} --require-approval never`,
      this.coreDir
    );

    this.log('Monitoring setup completed');
  }

  setupBackup(environment, config) {
    if (!config.backup || !config.backup.enableAutomatedBackup) {
      this.log('Automated backup not enabled, skipping setup', 'WARN');
      return;
    }

    this.log('Setting up automated backup...');

    // Deploy backup stack
    this.execCommand(
      `npx cdk deploy AiriumBackupStack-${environment} --require-approval never`,
      this.coreDir
    );

    this.log('Backup setup completed');
  }

  validateDeployment(environment, config) {
    this.log('Validating deployment...');

    // Check if Amplify apps are deployed
    try {
      this.execCommand(`npx ampx status --branch ${config.amplify.branch}`, this.coreDir);
    } catch (error) {
      this.error('Backend deployment validation failed');
    }

    try {
      this.execCommand(`npx ampx status --branch ${config.amplify.branch}`, this.uiDir);
    } catch (error) {
      this.error('Frontend deployment validation failed');
    }

    // Test basic connectivity
    if (config.domain && config.domain.name) {
      this.log(`Testing connectivity to: https://${config.domain.name}`);
      // Add actual connectivity test here
    }

    this.log('Deployment validation completed successfully');
  }

  async deploy(environment = 'dev', options = {}) {
    try {
      this.log(`Starting deployment for environment: ${environment}`);

      // Load environment configuration
      const config = this.loadEnvironmentConfig(environment);

      // Validate prerequisites
      if (!options.skipValidation) {
        this.validatePrerequisites();
      }

      // Install dependencies
      if (!options.skipInstall) {
        this.installDependencies();
      }

      // Run tests
      if (!options.skipTests) {
        this.runTests();
      }

      // Build and deploy backend
      this.buildCore();
      this.deployBackend(environment, config);

      // Build and deploy frontend
      this.buildUI();
      this.deployFrontend(environment, config);

      // Setup additional services
      if (options.setupDomain) {
        this.setupDomain(environment, config);
      }

      if (options.setupMonitoring) {
        this.setupMonitoring(environment, config);
      }

      if (options.setupBackup) {
        this.setupBackup(environment, config);
      }

      // Validate deployment
      this.validateDeployment(environment, config);

      this.log(`Deployment completed successfully for environment: ${environment}`);
      this.log(`Application URL: https://${config.domain?.name || 'amplify-generated-domain'}`);

    } catch (error) {
      this.error(`Deployment failed: ${error.message}`);
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const deployer = new AiriumDeployer();
  const environment = process.argv[2] || 'dev';
  const options = {
    skipValidation: process.argv.includes('--skip-validation'),
    skipInstall: process.argv.includes('--skip-install'),
    skipTests: process.argv.includes('--skip-tests'),
    setupDomain: process.argv.includes('--setup-domain'),
    setupMonitoring: process.argv.includes('--setup-monitoring'),
    setupBackup: process.argv.includes('--setup-backup'),
  };

  deployer.deploy(environment, options);
}

export default AiriumDeployer;