# Data Access Patterns for AIrium

This document describes the data access patterns implemented for AIrium's DynamoDB data layer using Amplify Gen 2.

## Overview

The data layer provides comprehensive data models and access patterns for:
- User and group management
- Application configuration and access control
- Real-time chat and voice sessions
- Media file management with user isolation
- User memory and context storage
- Notifications and UI control

## Data Models

### Core Entity Models

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

## Access Patterns

### 1. User-Centric Access Patterns

#### Get User Profile and Permissions
```typescript
// Get user with groups and applications
const user = await dataService.getUserById(userId);
const userGroups = user.groups;
const userApps = await dataService.getApplicationsByGroups(userGroups);
```

#### User Data Isolation
```typescript
// All user data is isolated by userId
const userSessions = await dataService.getChatSessionsByUser(userId);
const userFiles = await dataService.getMediaFilesByUser(userId);
const userMemories = await dataService.getUserMemoriesByUser(userId);
```

### 2. Group-Based Access Control

#### Application Visibility
```typescript
// Users only see applications their groups have access to
const userGroups = ['GENERAL', 'DEVELOPERS'];
const availableApps = await dataService.getApplicationsByGroups(userGroups);
```

#### Admin Operations
```typescript
// Admin users can manage all entities
if (user.profile === 'ADMIN') {
  const allUsers = await dataService.listUsers();
  const allGroups = await dataService.listGroups();
  const allApplications = await dataService.listApplications();
}
```

### 3. Real-Time Communication Patterns

#### Chat Session Management
```typescript
// Create new chat session
const session = await dataService.createChatSession({
  userId: 'user-123',
  connectionId: 'conn-456',
  title: 'AI Assistant Chat',
  context: { topic: 'general' }
});

// Add messages to session
const message = await dataService.createChatMessage({
  sessionId: session.sessionId,
  userId: 'user-123',
  type: 'TEXT',
  content: 'Hello, how can you help me today?'
});
```

#### Voice Session Integration
```typescript
// Create voice session linked to chat
const voiceSession = await dataService.createVoiceSession({
  connectionId: 'conn-456',
  userId: 'user-123',
  chatSessionId: session.sessionId,
  novaSonicSessionId: 'nova-789'
});
```

### 4. Media Management Patterns

#### User-Isolated File Storage
```typescript
// Files are automatically isolated by user
const mediaFile = await dataService.createMediaFile({
  userId: 'user-123',
  fileName: 'document.pdf',
  fileType: 'document',
  fileSize: 1024000,
  mimeType: 'application/pdf',
  s3Key: 'users/user-123/documents/document.pdf',
  s3Bucket: 'airium-media'
});
```

#### File Access Control
```typescript
// Users can only access their own files
const userFiles = await dataService.getMediaFilesByUser(userId);
// Admin users can access all files (if needed)
```

### 5. Memory and Context Patterns

#### Conversation Memory Storage
```typescript
// Store conversation context for AI
const memory = await dataService.createUserMemory({
  userId: 'user-123',
  type: 'CONVERSATION',
  content: {
    summary: 'User is interested in weather APIs',
    preferences: ['morning updates', 'detailed forecasts'],
    context: { location: 'San Francisco' }
  },
  relevanceScore: 0.95
});
```

#### Vector Storage Integration
```typescript
// Memory can include embeddings for vector search
const memoryWithEmbedding = await dataService.createUserMemory({
  userId: 'user-123',
  type: 'KNOWLEDGE',
  content: { fact: 'User prefers metric units' },
  embedding: 'vector-embedding-data-here',
  relevanceScore: 0.85
});
```

### 6. Notification and UI Control Patterns

#### System Notifications
```typescript
// Create notifications for users
const notification = await dataService.createNotification({
  userId: 'user-123',
  type: 'INFO',
  title: 'New Feature Available',
  message: 'Voice chat is now available in your dashboard',
  data: { feature: 'voice-chat', version: '1.1.0' },
  isPersistent: true
});
```

#### UI State Management
```typescript
// Notifications can control UI state
const uiNotification = await dataService.createNotification({
  userId: 'user-123',
  type: 'SUCCESS',
  title: 'File Uploaded',
  message: 'Your document has been processed',
  data: { 
    action: 'show-file-preview',
    fileId: 'file-123',
    autoHide: false
  }
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

## Query Optimization

### Global Secondary Indexes (GSI)

For efficient querying, the following GSI patterns are recommended:

```typescript
// User-based queries
GSI: userId-createdAt-index
- Partition Key: userId
- Sort Key: createdAt
- Use for: getUserSessions, getUserFiles, getUserMemories

// Group-based queries  
GSI: groupId-updatedAt-index
- Partition Key: groupId
- Sort Key: updatedAt
- Use for: getGroupApplications, getGroupMembers

// Session-based queries
GSI: sessionId-timestamp-index
- Partition Key: sessionId
- Sort Key: timestamp
- Use for: getChatMessages, getSessionHistory
```

### Pagination Patterns

```typescript
// Consistent pagination across all list operations
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

## Error Handling Patterns

### Consistent Error Types

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
      case DataErrorType.VALIDATION_ERROR:
        // Handle invalid input
        break;
      default:
        // Handle other errors
    }
  }
}
```

### Graceful Degradation

```typescript
// Fallback patterns for non-critical operations
try {
  await dataService.incrementChatSessionMessageCount(sessionId);
} catch (error) {
  // Log error but don't fail the main operation
  console.warn('Failed to update message count:', error);
}
```

## Performance Considerations

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

## Requirements Satisfaction

This data layer implementation satisfies:

- **7.1**: Chat data persistence in DynamoDB ✅
- **7.2**: Memory data persistence in DynamoDB ✅  
- **7.4**: Proper IAM permissions for user isolation ✅
- **10.3**: Amplify Gen 2 defineData for DynamoDB backend ✅

## Next Steps

1. **Vector Storage Integration**: Add vector database for semantic search
2. **Real-time Subscriptions**: Implement GraphQL subscriptions for live updates
3. **Analytics Queries**: Add specialized queries for usage analytics
4. **Data Archival**: Implement data lifecycle management
5. **Performance Monitoring**: Add CloudWatch metrics for query performance