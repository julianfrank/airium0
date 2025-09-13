# AIrium Core Module

This is the Core Module of AIrium, built with AWS Amplify Gen 2. It provides the backend infrastructure including authentication, data storage, real-time communication, and AI processing capabilities.

## Architecture

The Core Module follows the serverless architecture pattern from aws-samples/sample-serverless-nova-sonic-chat and includes:

- **Amplify Gen 2**: Backend infrastructure management
- **WebSocket API**: Real-time bidirectional communication
- **AppSync Events**: GraphQL subscriptions for real-time UI updates
- **Nova Sonic Integration**: Voice processing capabilities
- **DynamoDB**: Data storage for users, applications, and chat data
- **S3**: Media storage with user isolation
- **Lambda Functions**: Serverless compute for business logic

## Project Structure

```
packages/core/
├── amplify/                    # Amplify Gen 2 configuration
│   ├── auth/                   # Authentication resources
│   ├── data/                   # Data models and GraphQL schema
│   ├── storage/                # S3 storage configuration
│   └── backend.ts              # Main backend definition
├── lib/
│   ├── cdk-stacks/            # CDK stacks for additional services
│   │   ├── websocket-stack.ts
│   │   ├── nova-sonic-stack.ts
│   │   └── appsync-events-stack.ts
│   ├── lambda-functions/       # Lambda function implementations
│   │   ├── websocket-handler/
│   │   ├── nova-sonic-processor/
│   │   ├── appsync-event-publisher/
│   │   └── connection-manager/
│   └── graphql/               # GraphQL schema definitions
└── src/                       # TypeScript source code
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Deploy to AWS:
   ```bash
   npm run deploy
   ```

4. Generate outputs for UI module:
   ```bash
   npm run build:amplify
   ```

## Key Features

### Authentication & Authorization
- Cognito User Pool and Identity Pool
- Admin and General user roles
- Group-based access control

### Real-time Communication
- WebSocket API for bidirectional communication
- AppSync Events for GraphQL subscriptions
- Connection management and lifecycle handling

### AI Integration
- Nova Sonic voice processing
- Bedrock AI model integration
- Real-time voice and text processing

### Data Management
- User-isolated data storage
- Application management system
- Chat and voice session persistence

## Environment Variables

The following environment variables are automatically configured by Amplify:

- `CONNECTIONS_TABLE_NAME`: DynamoDB table for WebSocket connections
- `USER_POOL_ID`: Cognito User Pool ID
- `IDENTITY_POOL_ID`: Cognito Identity Pool ID
- `WEBSOCKET_API_ID`: WebSocket API Gateway ID
- `GRAPHQL_API_URL`: AppSync GraphQL API URL

## Development

### Running Tests
```bash
npm test
```

### Watch Mode
```bash
npm run dev
```

### Linting
```bash
npm run lint
```

### Clean Build Artifacts
```bash
npm run clean
```

## Deployment

The Core Module is deployed using Amplify Gen 2, which automatically manages:
- Infrastructure provisioning
- IAM permissions
- Environment configuration
- Resource dependencies

The `amplify_outputs.json` file is generated after deployment and should be imported by the UI Module for configuration.