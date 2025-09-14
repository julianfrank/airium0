# AIrium Deployment Guide

This guide provides comprehensive instructions for deploying the AIrium application across different environments.

## 🏗️ Architecture Overview

AIrium uses a serverless architecture with the following components:

- **Core Module**: Amplify Gen 2 backend with CDK extensions
- **UI Module**: Astro SSG frontend with React 19
- **Monitoring**: CloudWatch dashboards and alarms
- **Backup**: AWS Backup for data protection
- **Domain**: Custom domain with SSL/TLS

## 📋 Prerequisites

### Required Tools

- Node.js 18+ and npm 8+
- AWS CLI v2 configured with appropriate permissions
- Amplify CLI (`npm install -g @aws-amplify/cli`)
- Git for version control

### AWS Permissions

Your AWS user/role needs the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "amplify:*",
        "cloudformation:*",
        "iam:*",
        "lambda:*",
        "dynamodb:*",
        "s3:*",
        "cognito-idp:*",
        "cognito-identity:*",
        "appsync:*",
        "apigateway:*",
        "cloudwatch:*",
        "logs:*",
        "backup:*",
        "route53:*",
        "acm:*",
        "cloudfront:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### Environment Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/airium.git
   cd airium
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure AWS CLI**:
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, and region
   ```

## 🌍 Environment Configuration

### Environment Files

Create environment-specific configuration files in the `environments/` directory:

#### Development (`environments/dev.json`)
```json
{
  "environment": "dev",
  "aws": {
    "region": "us-east-1",
    "profile": "default"
  },
  "amplify": {
    "appId": "dev-airium-app",
    "branch": "develop"
  },
  "domain": {
    "name": "dev.devposthackathon.tojf.link"
  },
  "monitoring": {
    "enableCloudWatch": true,
    "logLevel": "DEBUG"
  }
}
```

#### Staging (`environments/staging.json`)
```json
{
  "environment": "staging",
  "aws": {
    "region": "us-east-1",
    "profile": "default"
  },
  "amplify": {
    "appId": "staging-airium-app",
    "branch": "staging"
  },
  "domain": {
    "name": "staging.devposthackathon.tojf.link"
  },
  "monitoring": {
    "enableCloudWatch": true,
    "enableXRay": true,
    "logLevel": "INFO"
  },
  "backup": {
    "enableAutomatedBackup": true,
    "retentionDays": 14
  }
}
```

#### Production (`environments/prod.json`)
```json
{
  "environment": "prod",
  "aws": {
    "region": "us-east-1",
    "profile": "default"
  },
  "amplify": {
    "appId": "prod-airium-app",
    "branch": "main"
  },
  "domain": {
    "name": "devposthackathon.tojf.link",
    "certificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/..."
  },
  "monitoring": {
    "enableCloudWatch": true,
    "enableXRay": true,
    "logLevel": "WARN",
    "enableAlarms": true,
    "snsTopicArn": "arn:aws:sns:us-east-1:123456789012:airium-alerts"
  },
  "backup": {
    "enableAutomatedBackup": true,
    "retentionDays": 30,
    "enableCrossRegionBackup": true,
    "backupRegion": "us-west-2"
  },
  "security": {
    "enableWAF": true,
    "enableCloudTrail": true,
    "enableGuardDuty": true
  }
}
```

## 🚀 Deployment Methods

### Method 1: Automated Deployment (Recommended)

Use the deployment script for automated deployment:

```bash
# Deploy to development
npm run deploy:dev

# Deploy to staging with monitoring and backup
npm run deploy:staging

# Deploy to production with all features
npm run deploy:prod
```

### Method 2: Manual Deployment

#### Step 1: Deploy Backend (Core Module)

```bash
cd packages/core

# Install dependencies
npm ci

# Build Lambda functions
npm run build:lambdas

# Build TypeScript
npm run build

# Deploy to specific environment
npx ampx deploy --branch <environment>
```

#### Step 2: Deploy Frontend (UI Module)

```bash
cd packages/ui

# Install dependencies
npm ci

# Copy amplify_outputs.json from Core module
cp ../core/amplify_outputs.json ./

# Build Astro application
npm run build

# Deploy to specific environment
npx ampx deploy --branch <environment>
```

#### Step 3: Deploy Additional Stacks (Optional)

```bash
cd packages/core

# Deploy monitoring stack
npm run deploy:monitoring

# Deploy backup stack
npm run deploy:backup

# Deploy domain stack
npm run deploy:domain
```

### Method 3: CI/CD Pipeline

The GitHub Actions workflow automatically deploys on:

- Push to `develop` → Development environment
- Push to `staging` → Staging environment
- Push to `main` → Production environment

#### Required GitHub Secrets

Set these secrets in your GitHub repository:

```
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

#### Required GitHub Variables

Set these variables for each environment:

```
AWS_REGION=us-east-1
BASE_URL=https://your-domain.com
```

## 🔧 Custom Domain Setup

### Step 1: DNS Configuration

1. **Create/Update Route53 Hosted Zone**:
   ```bash
   aws route53 create-hosted-zone --name devposthackathon.tojf.link --caller-reference $(date +%s)
   ```

2. **Update Domain Registrar**:
   - Point your domain's nameservers to the Route53 hosted zone NS records

### Step 2: SSL Certificate

1. **Request Certificate**:
   ```bash
   aws acm request-certificate \
     --domain-name devposthackathon.tojf.link \
     --subject-alternative-names "*.devposthackathon.tojf.link" \
     --validation-method DNS \
     --region us-east-1
   ```

2. **Validate Certificate**:
   - Add the DNS validation records to your Route53 hosted zone
   - Wait for certificate validation (can take 5-30 minutes)

### Step 3: Configure Amplify Domain

1. **Add Domain to Amplify App**:
   ```bash
   aws amplify create-domain-association \
     --app-id your-app-id \
     --domain-name devposthackathon.tojf.link \
     --sub-domain-settings prefix=www,branchName=main
   ```

2. **Update Environment Configuration**:
   - Add the certificate ARN to your environment configuration
   - Redeploy with domain setup enabled

## 📊 Monitoring Setup

### CloudWatch Dashboards

The monitoring stack creates dashboards for:

- Lambda function metrics (invocations, errors, duration)
- DynamoDB capacity utilization and throttling
- API Gateway request rates and error rates
- WebSocket connection metrics
- Nova Sonic usage and performance

### CloudWatch Alarms

Automatic alarms are created for:

- High error rates (>5 errors in 5 minutes)
- High latency (>5 seconds average)
- Throttling events
- Capacity utilization (>80%)

### Custom Metrics

The application publishes custom metrics:

```typescript
// WebSocket connections
await cloudWatch.putMetricData({
  Namespace: 'AIrium/WebSocket',
  MetricData: [{
    MetricName: 'ActiveConnections',
    Value: connectionCount,
    Dimensions: [{ Name: 'Environment', Value: environment }]
  }]
});

// Nova Sonic usage
await cloudWatch.putMetricData({
  Namespace: 'AIrium/NovaSonic',
  MetricData: [{
    MetricName: 'VoiceSessions',
    Value: sessionCount,
    Dimensions: [{ Name: 'Environment', Value: environment }]
  }]
});
```

## 💾 Backup Configuration

### Automated Backups

The backup stack configures:

- **Daily backups** with configurable retention
- **Weekly backups** for production (90-day retention)
- **Monthly backups** for production (1-year retention)
- **Cross-region backup** for production

### Backup Targets

- DynamoDB tables (point-in-time recovery)
- S3 buckets (versioning and cross-region replication)
- Lambda function code (stored in S3)

### Restore Process

1. **List Available Backups**:
   ```bash
   aws backup list-recovery-points --backup-vault-name airium-prod-backup-vault
   ```

2. **Start Restore Job**:
   ```bash
   aws backup start-restore-job \
     --recovery-point-arn arn:aws:backup:... \
     --metadata originalResourceArn=arn:aws:dynamodb:...
   ```

## 🔒 Security Configuration

### IAM Roles and Policies

The deployment creates least-privilege IAM roles:

- **Lambda Execution Roles**: Access to specific DynamoDB tables and S3 buckets
- **Amplify Service Roles**: Deploy and manage resources
- **Backup Service Roles**: Create and manage backups

### Data Encryption

- **At Rest**: DynamoDB and S3 use AWS managed encryption
- **In Transit**: All API calls use TLS 1.3
- **User Data**: S3 bucket policies enforce user isolation

### Security Headers

CloudFront distribution includes security headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'; ...
```

## 🧪 Testing Deployment

### Automated Validation

Run the deployment validation script:

```bash
# Validate specific environment
node scripts/validate-deployment.js prod

# The script checks:
# - Amplify outputs configuration
# - Backend service accessibility
# - Frontend deployment status
# - Domain connectivity
# - Monitoring setup
# - Backup configuration
# - Security settings
```

### Manual Testing

1. **Authentication Flow**:
   ```bash
   # Test user registration and login
   curl -X POST https://your-api-domain/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123!"}'
   ```

2. **WebSocket Connection**:
   ```bash
   # Test WebSocket endpoint
   wscat -c wss://your-websocket-domain
   ```

3. **Voice Chat**:
   - Open the application in a browser
   - Test voice recording and Nova Sonic responses
   - Verify real-time communication

### End-to-End Tests

Run Playwright tests against the deployed environment:

```bash
# Set the base URL for testing
export BASE_URL=https://devposthackathon.tojf.link

# Run E2E tests
npm run test:e2e

# Run specific test suite
npx playwright test e2e/auth.spec.ts
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Amplify Deployment Fails

**Symptoms**: Deployment hangs or fails with CloudFormation errors

**Solutions**:
```bash
# Check CloudFormation stack status
aws cloudformation describe-stacks --stack-name amplify-*

# Check Amplify app status
aws amplify get-app --app-id your-app-id

# Clean up and retry
npx ampx delete --force
npx ampx deploy
```

#### 2. Lambda Function Errors

**Symptoms**: 500 errors from API endpoints

**Solutions**:
```bash
# Check CloudWatch logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/

# View recent logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/your-function-name \
  --start-time $(date -d '1 hour ago' +%s)000
```

#### 3. WebSocket Connection Issues

**Symptoms**: Voice chat not working, connection errors

**Solutions**:
```bash
# Test WebSocket endpoint
wscat -c wss://your-websocket-url

# Check API Gateway logs
aws logs filter-log-events \
  --log-group-name API-Gateway-Execution-Logs_your-api-id/prod
```

#### 4. Domain/SSL Issues

**Symptoms**: SSL certificate errors, domain not accessible

**Solutions**:
```bash
# Check certificate status
aws acm describe-certificate --certificate-arn your-cert-arn

# Check Route53 records
aws route53 list-resource-record-sets --hosted-zone-id your-zone-id

# Test DNS resolution
nslookup devposthackathon.tojf.link
```

### Debug Mode

Enable debug logging:

```bash
# Set debug environment variable
export DEBUG=airium:*

# Run deployment with debug output
npm run deploy:dev
```

### Support Resources

- **CloudWatch Logs**: Check function execution logs
- **X-Ray Tracing**: Analyze request flows (if enabled)
- **AWS Support**: Create support cases for AWS service issues
- **GitHub Issues**: Report application-specific bugs

## 📈 Performance Optimization

### Lambda Optimization

- **Memory Allocation**: Adjust based on CloudWatch metrics
- **Provisioned Concurrency**: Enable for production functions
- **Dead Letter Queues**: Configure for error handling

### DynamoDB Optimization

- **Auto Scaling**: Enable for production tables
- **Global Secondary Indexes**: Optimize query patterns
- **Point-in-Time Recovery**: Enable for data protection

### S3 Optimization

- **Intelligent Tiering**: Reduce storage costs
- **Transfer Acceleration**: Improve upload performance
- **CloudFront Integration**: Cache static assets

## 🔄 Rollback Procedures

### Application Rollback

1. **Identify Last Good Deployment**:
   ```bash
   aws amplify list-jobs --app-id your-app-id --branch-name main
   ```

2. **Rollback to Previous Version**:
   ```bash
   git revert HEAD
   git push origin main
   # CI/CD will automatically deploy the reverted version
   ```

### Database Rollback

1. **Restore from Backup**:
   ```bash
   aws backup start-restore-job \
     --recovery-point-arn arn:aws:backup:... \
     --metadata originalResourceArn=arn:aws:dynamodb:...
   ```

2. **Point-in-Time Recovery**:
   ```bash
   aws dynamodb restore-table-to-point-in-time \
     --source-table-name airium-prod-table \
     --target-table-name airium-prod-table-restored \
     --restore-date-time 2024-01-01T10:00:00Z
   ```

## 📋 Maintenance

### Regular Tasks

- **Monitor CloudWatch alarms and dashboards**
- **Review backup job status weekly**
- **Update dependencies monthly**
- **Rotate access keys quarterly**
- **Review security settings quarterly**

### Cost Optimization

- **Review CloudWatch metrics for unused resources**
- **Optimize Lambda memory allocation**
- **Configure S3 lifecycle policies**
- **Monitor DynamoDB capacity utilization**

### Security Updates

- **Keep dependencies updated**
- **Review IAM policies regularly**
- **Monitor AWS Security Hub findings**
- **Update SSL certificates before expiration**

## 📞 Support

For deployment issues:

1. Check this documentation first
2. Review CloudWatch logs and metrics
3. Run the validation script
4. Create a GitHub issue with:
   - Environment details
   - Error messages
   - CloudWatch log excerpts
   - Steps to reproduce

For urgent production issues:
- Contact the on-call engineer
- Create an AWS support case (if applicable)
- Follow the incident response procedures