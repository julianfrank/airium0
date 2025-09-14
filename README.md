# AIrium - AI-Powered Groupware Solution

AIrium is a serverless, AI-powered groupware platform built on AWS infrastructure. It provides zero-cost-when-idle operation, user management, application management, and AI-powered interactions through voice, text, and multimedia inputs.

## 🏗️ Architecture

- **Backend**: Amplify Gen 2 with CDK for additional AWS services
- **Frontend**: Astro 5.13.7 SSG with React 19
- **AI Integration**: AWS Bedrock with Nova Sonic for voice interactions
- **Real-time Communication**: WebSocket API Gateway + AppSync Events
- **Storage**: DynamoDB for data, S3 for media with user isolation
- **Authentication**: Cognito User Pool and Identity Pool

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 8+
- AWS CLI configured with appropriate permissions
- Amplify CLI (`npm install -g @aws-amplify/cli`)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/airium.git
cd airium

# Install dependencies
npm install

# Build shared modules
npm run build
```

### Development

```bash
# Start development servers
npm run dev

# Run tests
npm run test

# Run E2E tests
npm run test:e2e
```

## 📦 Deployment

### Environment Setup

Configure environment-specific settings in `environments/`:

- `dev.json` - Development environment
- `staging.json` - Staging environment  
- `prod.json` - Production environment

### Deploy to Development

```bash
npm run deploy:dev
```

### Deploy to Staging

```bash
npm run deploy:staging
```

### Deploy to Production

```bash
npm run deploy:prod
```

### Manual Deployment

```bash
# Deploy specific environment with options
node scripts/deploy.js <environment> [options]

# Options:
# --skip-validation    Skip prerequisite validation
# --skip-install      Skip dependency installation
# --skip-tests        Skip running tests
# --setup-domain      Configure custom domain
# --setup-monitoring  Deploy monitoring stack
# --setup-backup      Deploy backup stack
```

## 🏛️ Project Structure

```
airium/
├── packages/
│   ├── core/                    # Backend (Amplify Gen 2)
│   │   ├── amplify/            # Amplify configuration
│   │   ├── lib/
│   │   │   ├── cdk-stacks/     # Additional CDK stacks
│   │   │   └── lambda-functions/ # Lambda function code
│   │   └── amplify_outputs.json
│   └── ui/                     # Frontend (Astro + React)
│       ├── src/
│       │   ├── components/     # React components
│       │   ├── pages/          # Astro pages
│       │   └── layouts/        # Page layouts
│       └── amplify_outputs.json
├── shared/                     # Shared types and utilities
├── environments/               # Environment configurations
├── scripts/                    # Deployment and utility scripts
├── e2e/                       # End-to-end tests
└── .github/workflows/         # CI/CD pipelines
```

## 🔧 Configuration

### Custom Domain Setup

1. Update `environments/<env>.json` with your domain configuration:

```json
{
  "domain": {
    "name": "your-domain.com",
    "certificateArn": "arn:aws:acm:..."
  }
}
```

2. Deploy with domain setup:

```bash
npm run deploy:prod
```

### Monitoring and Alerting

Configure monitoring in environment files:

```json
{
  "monitoring": {
    "enableCloudWatch": true,
    "enableXRay": true,
    "logLevel": "INFO",
    "retentionDays": 30,
    "enableAlarms": true,
    "snsTopicArn": "arn:aws:sns:..."
  }
}
```

### Backup Configuration

Configure automated backups:

```json
{
  "backup": {
    "enableAutomatedBackup": true,
    "retentionDays": 30,
    "enableCrossRegionBackup": true,
    "backupRegion": "us-west-2"
  }
}
```

## 🧪 Testing

### Unit Tests

```bash
# Run all unit tests
npm run test

# Run tests for specific module
npm run test --workspace=@airium/core
npm run test --workspace=@airium/ui
```

### End-to-End Tests

```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/auth.spec.ts
```

### Test Coverage

```bash
# Generate coverage report
npm run test:coverage --workspace=@airium/core
```

## 🔐 Security

### Authentication

- Multi-factor authentication through Cognito
- JWT token validation at API Gateway
- Role-based access control (Admin/General users)

### Data Protection

- Encryption at rest (DynamoDB, S3)
- Encryption in transit (TLS 1.3)
- User data isolation through IAM policies
- S3 bucket policies for media isolation

### Security Headers

CloudFront distribution includes security headers:
- Strict-Transport-Security
- X-Content-Type-Options
- X-Frame-Options
- Content-Security-Policy

## 📊 Monitoring

### CloudWatch Dashboards

- Lambda function metrics (invocations, errors, duration)
- DynamoDB capacity and throttling
- API Gateway request/error rates
- WebSocket connection metrics
- Nova Sonic usage metrics

### Alarms

- High error rates
- Performance degradation
- Capacity utilization
- Security events

### Logging

- Structured logging with correlation IDs
- CloudWatch log groups with retention policies
- X-Ray tracing for distributed requests

## 🔄 CI/CD Pipeline

GitHub Actions workflow includes:

1. **Test Stage**: Unit tests, security scans
2. **Build Stage**: Compile and package applications
3. **Deploy Backend**: Deploy Core module with Amplify
4. **Deploy Frontend**: Deploy UI module with Amplify
5. **E2E Tests**: Validate deployment with Playwright
6. **Monitoring**: Deploy monitoring and backup stacks

### Environment Promotion

- `develop` branch → Development environment
- `staging` branch → Staging environment  
- `main` branch → Production environment

## 🚨 Troubleshooting

### Common Issues

1. **Amplify deployment fails**
   ```bash
   # Check AWS credentials
   aws sts get-caller-identity
   
   # Verify Amplify CLI version
   npx ampx --version
   ```

2. **Lambda function errors**
   ```bash
   # Check CloudWatch logs
   aws logs describe-log-groups --log-group-name-prefix /aws/lambda/
   ```

3. **WebSocket connection issues**
   ```bash
   # Test WebSocket endpoint
   wscat -c wss://your-websocket-url
   ```

### Debug Mode

Enable debug logging:

```bash
export DEBUG=airium:*
npm run dev
```

## 📚 API Documentation

### Authentication Endpoints

- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/user` - Get current user info

### Application Management

- `GET /api/applications/user/{userId}` - Get user applications
- `POST /api/applications` - Create application (Admin)
- `PUT /api/applications/{id}` - Update application (Admin)
- `DELETE /api/applications/{id}` - Delete application (Admin)

### WebSocket Events

- `voice_session_start` - Start voice interaction
- `voice_data` - Send audio data
- `voice_session_end` - End voice session
- `chat_message` - Send text message

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Follow conventional commit messages
- Ensure security best practices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Create an issue for bug reports
- Join our Discord for community support
- Check the [Wiki](https://github.com/your-org/airium/wiki) for detailed documentation

## 🗺️ Roadmap

- [ ] Mobile app support
- [ ] Advanced AI model integration
- [ ] Multi-language support
- [ ] Enhanced analytics dashboard
- [ ] Third-party integrations (Slack, Teams)
- [ ] Advanced workflow automation