# AIrium Data Layer Services

This directory contains the data layer services for AIrium, implementing comprehensive data access patterns with proper IAM permissions using Amplify Gen 2.

## Overview

The data layer provides:
- **User and group management** with role-based access control
- **Application configuration** and access control
- **Real-time chat and voice sessions** with user isolation
- **Media file management** with S3 integration
- **User memory and context storage** for AI personalization
- **Notifications and UI control** for system communication

## Requirements Satisfied

- **7.1**: Chat data persistence in DynamoDB ✅
- **7.2**: Memory data persistence in DynamoDB ✅  
- **7.4**: Proper IAM permissions for user isolation ✅
- **10.3**: Amplify Gen 2 defineData for DynamoDB backend ✅

## Services

### DataService (`data-service.ts`)

Comprehensive data service with full CRUD operations and advanced data access patterns.

**Key Features:**
- Type-safe operations with proper error handling
- User isolation and group-based access control
- Batch operations and pagination support
- Automatic relationship management (e.g., message count updates)
- Comprehensive mapping between schema and domain types

**Usage:**
```typescript
import { DataService } from './data-service';

const dataService = new DataService();

// Create a user
const user = await dataService.createUser({
  email: 'user@example.com',
  profile: 'GENERAL',
  groups: ['GENERAL'],
  preferences: { theme: 'dark' }
});

// Create a chat session
const session = await dataService.createChatSession({
  userId: user.userId,
  title: 'Weather Discussion',
  context: { topic: 'weather' }
});

// Add a message (automatically increments session message count)
const message = await dataService.createChatMessage({
  sessionId: session.sessionId,
  userId: user.userId,
  type: 'TEXT',
  content: 'What is the weather like today?'
});
```

### SimpleDataService (`simple-data-service.ts`)

Simplified data service for basic CRUD operations with minimal configuration.

**Key Features:**
- Straightforward CRUD operations
- Basic error handling
- Minimal dependencies
- Quick setup for development and testing

**Usage:**
```typescript
import { SimpleDataService } from './simple-data-service';

const simpleService = new SimpleDataService();

// Basic user creation
const user = await simpleService.createUser('user@example.com', 'GENERAL');

// Basic chat session
const session = await simpleService.createChatSession(user.id, 'Chat Title');
```

## Data Models

### Core Entities

#### User Management
- **User**: Core user profile with authentication integration
- **Group**: User groups for access control and organization  
- **Application**: Configurable applications (REST/MCP/Inbuilt)

#### Communication
- **Connection**: WebSocket connection tracking
- **ChatSession**: Chat conversation containers
- **ChatMessage**: Individual messages with AI responses
- **VoiceSession**: Nova Sonic voice interaction sessions

#### Media & Memory
- **MediaFile**: File metadata with S3 integration
- **UserMemory**: Context and conversation memory storage
- **ApplicationUsage**: Usage analytics and tracking
- **Notification**: System notifications and UI control

## Data Access Patterns

### 1. User-Centric Access
```typescript
// Get user with groups and applications
const user = await dataService.getUserById(userId);
const userGroups = user.groups;
const userApps = await dataService.getApplicationsByGroups(userGroups);

// All user data is isolated by userId
const userSessions = await dataService.getChatSessionsByUser(userId);
const userFiles = await dataService.getMediaFilesByUser(userId);
const userMemories = await dataService.getUserMemoriesByUser(userId);
```

### 2. Group-Based Access Control
```typescript
// Users only see applications their groups have access to
const userGroups = ['GENERAL', 'DEVELOPERS'];
const availableApps = await dataService.getApplicationsByGroups(userGroups);

// Admin users can manage all entities
if (user.profile === 'ADMIN') {
  const allUsers = await dataService.listUsers();
  const allGroups = await dataService.listGroups();
}
```

### 3. Real-Time Communication
```typescript
// Create linked chat and voice sessions
const session = await dataService.createChatSession({
  userId: 'user-123',
  connectionId: 'conn-456',
  title: 'AI Assistant Chat'
});

const voiceSession = await dataService.createVoiceSession({
  connectionId: 'conn-456',
  userId: 'user-123',
  chatSessionId: session.sessionId,
  novaSonicSessionId: 'nova-789'
});
```

### 4. Memory and Context Storage
```typescript
// Store conversation context for AI
const memory = await dataService.createUserMemory({
  userId: 'user-123',
  type: 'CONVERSATION',
  content: {
    summary: 'User is interested in weather APIs',
    preferences: ['morning updates', 'detailed forecasts']
  },
  relevanceScore: 0.95
});

// Memory with vector embeddings for semantic search
const memoryWithEmbedding = await dataService.createUserMemory({
  userId: 'user-123',
  type: 'KNOWLEDGE',
  content: { fact: 'User prefers metric units' },
  embedding: 'vector-embedding-data-here',
  relevanceScore: 0.85
});
```

## Authorization Patterns

### Row-Level Security (RLS)

The schema implements fine-grained authorization:

```typescript
// User data - users can read/update their own data
.authorization((allow) => [
  allow.owner().to(['read', 'update']),
  allow.group('ADMIN').to(['create', 'read', 'update', 'delete'])
])

// Group data - authenticated users can read, admins can manage
.authorization((allow) => [
  allow.authenticated().to(['read']),
  allow.group('ADMIN').to(['create', 'read', 'update', 'delete'])
])

// Chat data - strict user isolation
.authorization((allow) => [
  allow.owner().to(['create', 'read', 'update', 'delete']),
  allow.group('ADMIN').to(['read']) // Admin can read for support
])
```

### IAM Integration

- **Cognito User Pool**: Primary authentication
- **Cognito Groups**: Role-based access control
- **Owner-based access**: User data isolation
- **Admin override**: Administrative access patterns

## Error Handling

### DataError Types

```typescript
enum DataErrorType {
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR', 
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DUPLICATE_KEY = 'DUPLICATE_KEY',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}
```

### Usage Example

```typescript
try {
  const user = await dataService.getUserById('invalid-id');
} catch (error) {
  if (error instanceof DataError) {
    switch (error.type) {
      case DataErrorType.NOT_FOUND:
        // Handle user not found
        break;
      case DataErrorType.PERMISSION_DENIED:
        // Handle access denied
        break;
      default:
        // Handle other errors
    }
  }
}
```

## Performance Considerations

### Pagination
```typescript
const result = await dataService.listUsers({
  limit: 20,
  nextToken: previousResult.nextToken
});

// Process results
result.items.forEach(user => processUser(user));

// Continue pagination if needed
if (result.nextToken) {
  const nextPage = await dataService.listUsers({
    limit: 20,
    nextToken: result.nextToken
  });
}
```

### Batch Operations
```typescript
// Batch create multiple entities when possible
const messages = await Promise.all([
  dataService.createChatMessage(message1),
  dataService.createChatMessage(message2),
  dataService.createChatMessage(message3)
]);
```

### Caching Strategies
```typescript
// Cache frequently accessed data
const userGroupsCache = new Map<string, string[]>();

async function getUserGroups(userId: string): Promise<string[]> {
  if (userGroupsCache.has(userId)) {
    return userGroupsCache.get(userId)!;
  }
  
  const user = await dataService.getUserById(userId);
  userGroupsCache.set(userId, user.groups);
  return user.groups;
}
```

## Testing

### Unit Tests
- **data-service-simple.test.ts**: Validates service structure, types, and patterns
- **data-integration.test.ts**: Integration tests for data layer functionality

### Running Tests
```bash
# Run all data service tests
npm test -- --run src/services/__tests__/

# Run specific test file
npm test -- --run src/services/__tests__/data-service-simple.test.ts
```

## Configuration

### Amplify Gen 2 Setup

The data layer is configured in `amplify/data/resource.ts` with:
- Complete data models for all entities
- Proper authorization rules
- IAM permissions for user isolation
- GraphQL API generation

### Environment Variables

No additional environment variables required - uses Amplify Gen 2 configuration.

## Next Steps

1. **Vector Storage Integration**: Add vector database for semantic search
2. **Real-time Subscriptions**: Implement GraphQL subscriptions for live updates  
3. **Analytics Queries**: Add specialized queries for usage analytics
4. **Data Archival**: Implement data lifecycle management
5. **Performance Monitoring**: Add CloudWatch metrics for query performance

## Files

- `data-service.ts` - Comprehensive data service with full functionality
- `simple-data-service.ts` - Simplified data service for basic operations
- `data-patterns.md` - Detailed documentation of data access patterns
- `__tests__/data-service-simple.test.ts` - Unit tests for data services
- `__tests__/data-integration.test.ts` - Integration tests for data layer
- `../types/data.ts` - TypeScript type definitions for all data models