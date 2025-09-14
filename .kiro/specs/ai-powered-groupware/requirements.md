# Requirements Document

## Introduction

AIrium is an AI-powered groupware solution built on a completely serverless AWS architecture. The system provides a zero-cost-when-idle platform that combines user management, application management, and AI-powered interactions through voice, text, and multimedia inputs. The solution uses Amplify Gen 2 for backend infrastructure, Astro SSG for the frontend, and integrates with AWS Bedrock for AI capabilities.

## Requirements

### Requirement 1: Serverless Infrastructure Architecture

**User Story:** As a system administrator, I want a completely serverless architecture with zero cost when not in use, so that operational costs are minimized and the system scales automatically.

#### Acceptance Criteria

1. WHEN the system is deployed THEN it SHALL use only serverless AWS components (Amplify Gen 2, Lambda, DynamoDB, S3, API Gateway, AppSync, Cognito)
2. WHEN no users are active THEN the system SHALL incur zero compute costs
3. WHEN the system is built THEN it SHALL use CDK for infrastructure as code following the pattern from aws-samples/sample-serverless-nova-sonic-chat
4. WHEN infrastructure is provisioned THEN Amplify Gen 2 SHALL manage backend infrastructure and IAM permissions

### Requirement 2: Frontend Architecture and Hosting

**User Story:** As a user, I want a responsive web application that works seamlessly across desktop, tablet, and mobile devices, so that I can access the system from any device.

#### Acceptance Criteria

1. WHEN the frontend is built THEN it SHALL use Astro 5.13.7 in SSG mode with React 19
2. WHEN the application is hosted THEN it SHALL be deployed on Amplify Gen 2 using SSG model
3. WHEN UI components are needed THEN the system SHALL use Amplify React UI as primary framework and ShadCN for unsupported components
4. WHEN the application is accessed THEN it SHALL be responsive across desktop, tablet, and mobile devices
5. WHEN the application is deployed THEN it SHALL be available at https://devposthackathon.tojf.link

### Requirement 3: User Management System

**User Story:** As an admin user, I want comprehensive user management capabilities, so that I can control access and organize users effectively.

#### Acceptance Criteria

1. WHEN a user is created THEN they SHALL be assigned to either Admin or General user profile by default (General)
2. WHEN an admin manages users THEN they SHALL be able to add and remove Cognito Users
3. WHEN an admin manages groups THEN they SHALL be able to add and remove Cognito Groups
4. WHEN an admin manages identity pools THEN they SHALL be able to add and remove Cognito Identity Pools
5. WHEN an admin assigns users THEN they SHALL be able to add and remove users from Cognito Groups

### Requirement 4: Application Management System

**User Story:** As an admin user, I want to manage different types of applications and their access permissions, so that I can control what functionality each user group can access.

#### Acceptance Criteria

1. WHEN an admin creates REST applications THEN they SHALL be able to edit parameters including URL, query parameters, and contextual remarks
2. WHEN an admin creates MCP applications THEN they SHALL be able to edit parameters including URL, transport type, MCP parameters, and contextual remarks
3. WHEN an admin creates inbuilt applications THEN they SHALL be able to manage prebuilt URLs that are part of the UI module
4. WHEN an admin manages application access THEN they SHALL be able to add and remove REST, MCP, and inbuilt applications from Cognito Groups

### Requirement 5: User Access Control and Application Visibility

**User Story:** As a general user, I want to see only the applications I have access to, so that the interface is clean and I'm not confused by unavailable functionality.

#### Acceptance Criteria

1. WHEN a general user logs in THEN they SHALL see the main UI by default
2. WHEN a user views applications THEN they SHALL only see applications their groups have access to
3. WHEN a user lacks access to an application THEN that application SHALL NOT be displayed in their interface

### Requirement 6: Multimedia Input and AI Integration

**User Story:** As a user, I want multiple ways to interact with the AI system including voice, text, and file uploads, so that I can communicate in the most convenient way for my situation.

#### Acceptance Criteria

1. WHEN a user provides input THEN the system SHALL accept text through a simple text box
2. WHEN a user wants voice interaction THEN the system SHALL use Nova Sonic for voice-based input and output
3. WHEN a user records content THEN the system SHALL allow recording of voice notes and video notes
4. WHEN a user uploads files THEN the system SHALL accept document uploads
5. WHEN media is stored THEN all images, videos, and documents SHALL be stored in S3 with completely isolated directories per user

### Requirement 7: Data Storage and Management

**User Story:** As a system architect, I want secure and scalable data storage for both user content and system data, so that the system can handle growth while maintaining data isolation.

#### Acceptance Criteria

1. WHEN chat data is stored THEN it SHALL be persisted in DynamoDB or S3 vector storage
2. WHEN memory data is stored THEN it SHALL be persisted in DynamoDB or S3 vector storage
3. WHEN user media is stored THEN each user SHALL have completely isolated S3 directories
4. WHEN data is accessed THEN proper IAM permissions SHALL enforce user isolation

### Requirement 8: Modular Architecture with NPM Monorepo

**User Story:** As a developer, I want a well-organized codebase with clear separation of concerns, so that the system is maintainable and different teams can work on different modules.

#### Acceptance Criteria

1. WHEN the project is structured THEN it SHALL use NPM monorepo to isolate different modules
2. WHEN modules share configuration THEN Amplify configuration SHALL be shared using import/export between workspaces
3. WHEN the Core Module is built THEN it SHALL manage backend applications using Amplify Gen 2
4. WHEN the UI Module is built THEN it SHALL import amplify_outputs.json from the Core Module

### Requirement 9: UI Control and Display Management

**User Story:** As a user, I want the system to dynamically control what I see on screen based on AI interactions, so that the interface adapts to provide relevant information.

#### Acceptance Criteria

1. WHEN the core module needs to control display THEN it SHALL be able to show and remove notes
2. WHEN rich content is displayed THEN the system SHALL show and remove rich notes based on markdown with image and mermaid plugins
3. WHEN media content is generated THEN the system SHALL show and remove images and videos from approved applications
4. WHEN UI updates occur THEN they SHALL be controlled by the core module through the UI control solution

### Requirement 10: Authentication and Authorization Integration

**User Story:** As a system user, I want secure authentication and proper authorization, so that my data is protected and I can only access what I'm permitted to use.

#### Acceptance Criteria

1. WHEN authentication is implemented THEN it SHALL use Cognito User Pool and Identity Pool
2. WHEN the backend is configured THEN Amplify Gen 2 SHALL use defineAuth for Cognito backend
3. WHEN data access is configured THEN Amplify Gen 2 SHALL use defineData for DynamoDB backend
4. WHEN additional backends are needed THEN CDK SHALL generate configurations and output to amplify_outputs.json