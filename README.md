# Airium - AI-Powered Groupware Solution

A serverless AI-powered groupware platform built on AWS infrastructure using Amplify Gen 2, Astro SSG, and React 19.

## Architecture

This project uses an NPM monorepo structure with the following modules:

### Core Module (`packages/core`)
- Backend infrastructure using Amplify Gen 2
- AWS CDK stacks for additional services
- Lambda functions and business logic
- Authentication and data management

### UI Module (`packages/ui`)
- Frontend built with Astro SSG and React 19
- Amplify React UI components and ShadCN
- Responsive design for desktop, tablet, and mobile

### Shared Module (`shared`)
- Common TypeScript types and interfaces
- Utility functions and constants
- Shared validation logic

## Development Setup

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- AWS CLI configured
- Amplify CLI installed

### Installation

```bash
# Install dependencies for all workspaces
npm install

# Build shared module first
npm run shared:build

# Build core module
npm run core:build

# Build UI module
npm run ui:build
```

### Development Commands

```bash
# Run all workspaces in development mode
npm run dev

# Run specific workspace
npm run core:dev
npm run ui:dev

# Run tests
npm run test

# Lint code
npm run lint

# Clean all build artifacts
npm run clean
```

## Project Structure

```
airium/
├── packages/
│   ├── core/                    # Core Module (Amplify Gen 2)
│   │   ├── amplify/            # Amplify configuration
│   │   ├── src/                # Source code
│   │   └── package.json
│   └── ui/                     # UI Module (Astro + React)
│       ├── src/                # Source code
│       ├── astro.config.mjs    # Astro configuration
│       └── package.json
├── shared/                     # Shared types and utilities
│   ├── src/
│   │   ├── types/             # TypeScript interfaces
│   │   └── utils/             # Utility functions
│   └── package.json
├── tsconfig.json              # Root TypeScript config
├── vitest.config.ts           # Test configuration
└── package.json               # Root package.json
```

## Technology Stack

- **Backend**: AWS Amplify Gen 2, Lambda, DynamoDB, S3, API Gateway, AppSync, Cognito
- **Frontend**: Astro SSG, React 19, Amplify React UI, ShadCN, Tailwind CSS
- **Voice**: Nova Sonic integration for voice interactions
- **AI**: AWS Bedrock for AI processing
- **Development**: TypeScript, Vitest, ESLint, Prettier

## Features

- Zero-cost-when-idle serverless architecture
- User and group management with Cognito
- Application management (REST, MCP, Inbuilt)
- Real-time voice and text chat with AI
- Media upload and management
- Responsive web interface
- Role-based access control

## License

See LICENSE file for details.