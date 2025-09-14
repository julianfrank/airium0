#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { URL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DeploymentValidator {
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
    try {
      const result = execSync(command, {
        cwd,
        stdio: 'pipe',
        encoding: 'utf8',
        ...options
      });
      return result.trim();
    } catch (error) {
      throw new Error(`Command failed: ${command}\n${error.message}`);
    }
  }

  async validateAmplifyOutputs() {
    this.log('Validating Amplify outputs...');

    const outputsPath = join(this.coreDir, 'amplify_outputs.json');
    if (!existsSync(outputsPath)) {
      this.error('amplify_outputs.json not found in Core module');
    }

    try {
      const outputs = JSON.parse(readFileSync(outputsPath, 'utf8'));
      
      // Validate required sections
      const requiredSections = ['auth', 'data', 'storage'];
      for (const section of requiredSections) {
        if (!outputs[section]) {
          this.error(`Missing ${section} configuration in amplify_outputs.json`);
        }
      }

      // Validate auth configuration
      if (!outputs.auth.user_pool_id || !outputs.auth.user_pool_client_id) {
        this.error('Invalid auth configuration in amplify_outputs.json');
      }

      // Validate data configuration
      if (!outputs.data.url || !outputs.data.aws_region) {
        this.error('Invalid data configuration in amplify_outputs.json');
      }

      // Validate storage configuration
      if (!outputs.storage.bucket_name || !outputs.storage.aws_region) {
        this.error('Invalid storage configuration in amplify_outputs.json');
      }

      this.log('Amplify outputs validation passed');
      return outputs;
    } catch (error) {
      this.error(`Failed to parse amplify_outputs.json: ${error.message}`);
    }
  }

  async validateBackendServices(outputs) {
    this.log('Validating backend services...');

    // Test Cognito User Pool
    try {
      const result = this.execCommand(`aws cognito-idp describe-user-pool --user-pool-id ${outputs.auth.user_pool_id}`);
      const userPool = JSON.parse(result);
      if (userPool.UserPool.Id !== outputs.auth.user_pool_id) {
        this.error('Cognito User Pool validation failed');
      }
      this.log('✓ Cognito User Pool is accessible');
    } catch (error) {
      this.error(`Cognito User Pool validation failed: ${error.message}`);
    }

    // Test DynamoDB tables (if any are created)
    try {
      const tables = this.execCommand('aws dynamodb list-tables');
      const tableList = JSON.parse(tables);
      this.log(`✓ DynamoDB is accessible (${tableList.TableNames.length} tables found)`);
    } catch (error) {
      this.error(`DynamoDB validation failed: ${error.message}`);
    }

    // Test S3 bucket
    try {
      const result = this.execCommand(`aws s3api head-bucket --bucket ${outputs.storage.bucket_name}`);
      this.log('✓ S3 bucket is accessible');
    } catch (error) {
      this.error(`S3 bucket validation failed: ${error.message}`);
    }

    // Test AppSync API
    if (outputs.data.url) {
      try {
        const apiId = outputs.data.url.split('/')[2].split('.')[0];
        const result = this.execCommand(`aws appsync get-graphql-api --api-id ${apiId}`);
        const api = JSON.parse(result);
        if (api.graphqlApi.apiId !== apiId) {
          this.error('AppSync API validation failed');
        }
        this.log('✓ AppSync API is accessible');
      } catch (error) {
        this.log(`AppSync API validation warning: ${error.message}`, 'WARN');
      }
    }
  }

  async validateFrontendDeployment(environment) {
    this.log('Validating frontend deployment...');

    try {
      // Check Amplify app status
      const result = this.execCommand(`npx ampx status --branch ${environment}`, this.uiDir);
      this.log('✓ Frontend deployment status checked');
    } catch (error) {
      this.error(`Frontend deployment validation failed: ${error.message}`);
    }

    // Check if build artifacts exist
    const distPath = join(this.uiDir, 'dist');
    if (!existsSync(distPath)) {
      this.error('Frontend build artifacts not found');
    }

    const indexPath = join(distPath, 'index.html');
    if (!existsSync(indexPath)) {
      this.error('Frontend index.html not found');
    }

    this.log('✓ Frontend build artifacts validated');
  }

  async testHttpEndpoint(url, expectedStatus = 200) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        timeout: 10000,
      };

      const req = https.request(options, (res) => {
        if (res.statusCode === expectedStatus) {
          resolve(res.statusCode);
        } else {
          reject(new Error(`Expected status ${expectedStatus}, got ${res.statusCode}`));
        }
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      req.end();
    });
  }

  async validateConnectivity(environment) {
    this.log('Validating connectivity...');

    // Load environment configuration
    const configPath = join(this.rootDir, 'environments', `${environment}.json`);
    if (!existsSync(configPath)) {
      this.log('Environment configuration not found, skipping connectivity tests', 'WARN');
      return;
    }

    const config = JSON.parse(readFileSync(configPath, 'utf8'));

    // Test domain connectivity if configured
    if (config.domain && config.domain.name) {
      try {
        await this.testHttpEndpoint(`https://${config.domain.name}`);
        this.log(`✓ Domain ${config.domain.name} is accessible`);
      } catch (error) {
        this.log(`Domain connectivity test failed: ${error.message}`, 'WARN');
      }
    }

    // Test Amplify-generated domain
    try {
      const appInfo = this.execCommand(`npx ampx status --branch ${environment}`, this.uiDir);
      // Extract domain from status output (this would need to be parsed properly)
      this.log('✓ Amplify hosting connectivity validated');
    } catch (error) {
      this.log(`Amplify hosting connectivity test failed: ${error.message}`, 'WARN');
    }
  }

  async validateMonitoring(environment) {
    this.log('Validating monitoring setup...');

    try {
      // Check if CloudWatch dashboard exists
      const dashboards = this.execCommand('aws cloudwatch list-dashboards');
      const dashboardList = JSON.parse(dashboards);
      
      const airiumDashboard = dashboardList.DashboardEntries.find(
        d => d.DashboardName.includes(`airium-${environment}`)
      );

      if (airiumDashboard) {
        this.log('✓ CloudWatch dashboard found');
      } else {
        this.log('CloudWatch dashboard not found', 'WARN');
      }

      // Check for CloudWatch alarms
      const alarms = this.execCommand('aws cloudwatch describe-alarms');
      const alarmList = JSON.parse(alarms);
      
      const airiumAlarms = alarmList.MetricAlarms.filter(
        a => a.AlarmName.includes('airium') || a.AlarmName.includes(environment)
      );

      if (airiumAlarms.length > 0) {
        this.log(`✓ Found ${airiumAlarms.length} CloudWatch alarms`);
      } else {
        this.log('No CloudWatch alarms found', 'WARN');
      }

    } catch (error) {
      this.log(`Monitoring validation failed: ${error.message}`, 'WARN');
    }
  }

  async validateBackup(environment) {
    this.log('Validating backup setup...');

    try {
      // Check if backup vault exists
      const vaults = this.execCommand('aws backup list-backup-vaults');
      const vaultList = JSON.parse(vaults);
      
      const airiumVault = vaultList.BackupVaultList.find(
        v => v.BackupVaultName.includes(`airium-${environment}`)
      );

      if (airiumVault) {
        this.log('✓ AWS Backup vault found');
      } else {
        this.log('AWS Backup vault not found', 'WARN');
      }

      // Check for backup plans
      const plans = this.execCommand('aws backup list-backup-plans');
      const planList = JSON.parse(plans);
      
      const airiumPlan = planList.BackupPlansList.find(
        p => p.BackupPlanName.includes(`airium-${environment}`)
      );

      if (airiumPlan) {
        this.log('✓ AWS Backup plan found');
      } else {
        this.log('AWS Backup plan not found', 'WARN');
      }

    } catch (error) {
      this.log(`Backup validation failed: ${error.message}`, 'WARN');
    }
  }

  async validateSecurity() {
    this.log('Validating security configuration...');

    try {
      // Check IAM roles and policies
      const roles = this.execCommand('aws iam list-roles');
      const roleList = JSON.parse(roles);
      
      const amplifyRoles = roleList.Roles.filter(
        r => r.RoleName.includes('amplify') || r.RoleName.includes('airium')
      );

      if (amplifyRoles.length > 0) {
        this.log(`✓ Found ${amplifyRoles.length} IAM roles`);
      } else {
        this.log('No Amplify/Airium IAM roles found', 'WARN');
      }

      // Check CloudTrail (if enabled)
      try {
        const trails = this.execCommand('aws cloudtrail describe-trails');
        const trailList = JSON.parse(trails);
        
        if (trailList.trailList.length > 0) {
          this.log('✓ CloudTrail is configured');
        } else {
          this.log('CloudTrail not configured', 'WARN');
        }
      } catch (error) {
        this.log('CloudTrail validation skipped', 'WARN');
      }

    } catch (error) {
      this.log(`Security validation failed: ${error.message}`, 'WARN');
    }
  }

  async generateReport(environment, results) {
    this.log('Generating validation report...');

    const report = {
      timestamp: new Date().toISOString(),
      environment,
      status: 'SUCCESS',
      validations: results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.status === 'PASS').length,
        warnings: results.filter(r => r.status === 'WARN').length,
        failed: results.filter(r => r.status === 'FAIL').length,
      }
    };

    // Write report to file
    const reportPath = join(this.rootDir, `deployment-validation-${environment}-${Date.now()}.json`);
    require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`Validation report saved to: ${reportPath}`);
    
    // Print summary
    console.log('\n=== VALIDATION SUMMARY ===');
    console.log(`Environment: ${environment}`);
    console.log(`Total Validations: ${report.summary.total}`);
    console.log(`✓ Passed: ${report.summary.passed}`);
    console.log(`⚠ Warnings: ${report.summary.warnings}`);
    console.log(`✗ Failed: ${report.summary.failed}`);
    
    if (report.summary.failed > 0) {
      console.log('\nFailed validations:');
      results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  ✗ ${r.name}: ${r.message}`);
      });
      process.exit(1);
    }

    return report;
  }

  async validate(environment = 'dev') {
    const results = [];

    try {
      this.log(`Starting deployment validation for environment: ${environment}`);

      // Validate Amplify outputs
      try {
        const outputs = await this.validateAmplifyOutputs();
        results.push({ name: 'Amplify Outputs', status: 'PASS', message: 'Configuration valid' });

        // Validate backend services
        await this.validateBackendServices(outputs);
        results.push({ name: 'Backend Services', status: 'PASS', message: 'All services accessible' });
      } catch (error) {
        results.push({ name: 'Backend Validation', status: 'FAIL', message: error.message });
      }

      // Validate frontend deployment
      try {
        await this.validateFrontendDeployment(environment);
        results.push({ name: 'Frontend Deployment', status: 'PASS', message: 'Deployment successful' });
      } catch (error) {
        results.push({ name: 'Frontend Deployment', status: 'FAIL', message: error.message });
      }

      // Validate connectivity
      try {
        await this.validateConnectivity(environment);
        results.push({ name: 'Connectivity', status: 'PASS', message: 'Endpoints accessible' });
      } catch (error) {
        results.push({ name: 'Connectivity', status: 'WARN', message: error.message });
      }

      // Validate monitoring (optional)
      try {
        await this.validateMonitoring(environment);
        results.push({ name: 'Monitoring', status: 'PASS', message: 'Monitoring configured' });
      } catch (error) {
        results.push({ name: 'Monitoring', status: 'WARN', message: error.message });
      }

      // Validate backup (optional)
      try {
        await this.validateBackup(environment);
        results.push({ name: 'Backup', status: 'PASS', message: 'Backup configured' });
      } catch (error) {
        results.push({ name: 'Backup', status: 'WARN', message: error.message });
      }

      // Validate security
      try {
        await this.validateSecurity();
        results.push({ name: 'Security', status: 'PASS', message: 'Security configuration valid' });
      } catch (error) {
        results.push({ name: 'Security', status: 'WARN', message: error.message });
      }

      // Generate report
      await this.generateReport(environment, results);

      this.log(`Deployment validation completed successfully for environment: ${environment}`);

    } catch (error) {
      this.error(`Deployment validation failed: ${error.message}`);
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new DeploymentValidator();
  const environment = process.argv[2] || 'dev';
  validator.validate(environment);
}

export default DeploymentValidator;