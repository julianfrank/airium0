# WebSocket Handler

This Lambda function handles WebSocket connections for real-time communication in the AIrium platform.

## Overview

The WebSocket handler manages the complete lifecycle of WebSocket connections, including:
- Connection establishment and termination
- Real-time message routing
- Voice session management
- Text message processing
- Connection state management in DynamoDB

## Architecture

### WebSocket Routes

- **$connect**: Handles new WebSocket connections
- **$disconnect**: Handles connection termination
- **$default**: Handles all incoming messages

### Message Types

#### Voice Messages
- `voice_start`: Initiates a voice session
- `voice_data`: Processes audio data chunks
- `voice_end`: Terminates a voice session

#### Text Messages
- `text_message`: Processes text input for AI interaction

#### System Messages
- `ping`: Health check message (responds with `pong`)

### Connection Management

Connections are stored in DynamoDB with the following schema:

```typescript
interface ConnectionInfo {
  connectionId: string;
  userId: string;
  sessionId?: string;
  status: 'CONNECTED' | 'DISCONNECTED';
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  lastActivity: string;
  disconnectedAt?: string;
}
```

### Error Handling

The handler implements comprehensive error handling:
- DynamoDB operation failures
- API Gateway Management API errors
- Stale connection cleanup (GoneException)
- Message parsing errors

## Environment Variables

- `CONNECTIONS_TABLE_NAME`: DynamoDB table for connection management
- `USER_POOL_ID`: Cognito User Pool ID for authentication
- `IDENTITY_POOL_ID`: Cognito Identity Pool ID for authorization

## Requirements Satisfied

### Requirement 1.1 - Serverless Infrastructure
- Uses AWS Lambda for compute (zero cost when idle)
- Integrates with API Gateway WebSocket API
- Stores connection state in DynamoDB

### Requirement 6.2 - Real-time Communication
- Provides WebSocket infrastructure for voice and text communication
- Supports bidirectional real-time messaging
- Manages connection lifecycle and state

## Usage

### Client Connection

```javascript
const ws = new WebSocket('wss://your-api-id.execute-api.region.amazonaws.com/prod?userId=user123');

ws.onopen = () => {
  console.log('Connected to WebSocket');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

### Voice Session

```javascript
// Start voice session
ws.send(JSON.stringify({
  type: 'voice_start',
  data: {
    audioFormat: 'webm',
    sessionId: 'voice-session-123'
  }
}));

// Send audio data
ws.send(JSON.stringify({
  type: 'voice_data',
  data: {
    audioData: 'base64-encoded-audio',
    sessionId: 'voice-session-123'
  }
}));

// End voice session
ws.send(JSON.stringify({
  type: 'voice_end',
  data: {
    sessionId: 'voice-session-123'
  }
}));
```

### Text Message

```javascript
ws.send(JSON.stringify({
  type: 'text_message',
  data: {
    content: 'Hello, AI!',
    sessionId: 'chat-session-123'
  }
}));
```

## Testing

The WebSocket handler is thoroughly tested with:
- Unit tests for all message types
- Connection lifecycle tests
- Error handling scenarios
- Requirements validation tests

Run tests with:
```bash
npm test src/test/websocket-handler.test.ts
```

## Integration

The WebSocket handler integrates with:
- **Nova Sonic Stack**: For voice processing
- **AppSync Events**: For real-time UI updates
- **Connection Manager**: For connection lifecycle management
- **Data Layer**: For persistent storage

## Security

- Connection authentication via query parameters
- User isolation through connection metadata
- Input validation and sanitization
- Rate limiting through API Gateway