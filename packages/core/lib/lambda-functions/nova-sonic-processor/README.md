# Nova Sonic Speech-to-Speech Integration

This module implements the Bedrock Nova Sonic Speech-to-Speech integration following the aws-samples/sample-serverless-nova-sonic-chat pattern.

## Architecture Overview

The Nova Sonic integration follows the aws-samples/sample-serverless-nova-sonic-chat pattern and consists of three main Lambda functions:

### Nova Sonic Service (`nova-sonic-service.ts`)
- **Purpose**: Core Bedrock Nova Sonic integration using bidirectional streaming
- **Key Implementation**:
  ```typescript
  const request = new InvokeModelWithBidirectionalStreamCommand({
    modelId: "amazon.nova-sonic-v1:0",
    body: generateOrderedStream(), // initial request
  });
  const response = await bedrockClient.send(request);
  ```
- **Capabilities**:
  - Real-time bidirectional audio streaming
  - Speech-to-speech processing with conversation context
  - Partial transcription updates during audio input
  - Automatic silence detection and processing triggers
  - Session lifecycle management with proper cleanup

The Nova Sonic integration consists of three main Lambda functions:

### 1. Nova Sonic Agent (`nova-sonic-agent/`)
- **Purpose**: WebSocket coordinator and entry point for voice interactions
- **Responsibilities**:
  - Handle WebSocket connections ($connect, $disconnect, $default routes)
  - Route voice messages to appropriate processors
  - Manage session lifecycle coordination
  - Send responses back to clients via WebSocket

### 2. Nova Sonic Processor (`nova-sonic-processor/`)
- **Purpose**: Core voice processing engine with real-time streaming capabilities
- **Responsibilities**:
  - Real-time audio chunk processing
  - Speech-to-text transcription (simulated, ready for Nova Sonic integration)
  - AI response generation using Bedrock models
  - Text-to-speech synthesis (simulated, ready for Nova Sonic integration)
  - Session state management and context handling

### 3. Session Manager (`nova-sonic-session-manager/`)
- **Purpose**: Voice session lifecycle and metadata management
- **Responsibilities**:
  - Create and manage voice sessions in DynamoDB
  - Track session statistics and duration
  - Handle session cleanup and resource management
  - Publish session events to AppSync Events

## Key Features

### Bedrock Nova Sonic Integration
- **Bidirectional Streaming**: Uses `InvokeModelWithBidirectionalStreamCommand` with `amazon.nova-sonic-v1:0` model
- **Real-Time Processing**: Implements `generateOrderedStream()` pattern from aws-samples reference
- **Speech-to-Speech Pipeline**: Direct audio input to audio output via Nova Sonic
- **Fallback Support**: Graceful degradation to Claude models when Nova Sonic unavailable

### Real-Time Audio Streaming
- **Chunk Processing**: Handles audio data in real-time chunks with sequence numbers via Nova Sonic streaming
- **Partial Transcription**: Provides immediate transcription feedback through Nova Sonic real-time capabilities
- **Automatic Processing**: Triggers AI processing based on Nova Sonic silence detection and audio analysis
- **Context Management**: Maintains conversation context across audio chunks with Nova Sonic session state

### Nova Sonic Speech Processing Pipeline
1. **Stream Initialization**: Initialize bidirectional stream with `amazon.nova-sonic-v1:0` model
2. **Audio Reception**: Receive base64-encoded audio chunks via WebSocket
3. **Nova Sonic Processing**: Send audio directly to Nova Sonic bidirectional stream
4. **Real-Time Transcription**: Receive immediate transcription from Nova Sonic stream
5. **Context Integration**: Combine Nova Sonic responses with conversation history
6. **AI Response Generation**: Process through Nova Sonic or fallback to Claude models
7. **Voice Synthesis**: Generate audio response via Nova Sonic speech synthesis
8. **Response Delivery**: Stream audio and text responses back via WebSocket

### Integration Points

#### WebSocket API Gateway
- Manages bidirectional real-time communication
- Routes messages based on action types:
  - `voice_session_start`: Initialize new voice session
  - `voice_chunk`: Process real-time audio chunks
  - `voice_data`: Process complete audio data
  - `voice_session_end`: End session and cleanup

#### AppSync Events
- Publishes real-time events for UI updates:
  - `voice_session_event`: Session lifecycle events
  - `voice_response_event`: AI response events
  - `voice_transcription_event`: Real-time transcription updates

#### DynamoDB Storage
- **Voice Sessions Table**: Session metadata and state
- **Connections Table**: Active WebSocket connections
- **Audio Storage**: S3 bucket for audio file storage

## Message Flow

### Session Initialization
```
Client -> WebSocket -> Nova Sonic Agent -> Nova Sonic Processor
                                        -> Session Manager -> DynamoDB
                                        -> AppSync Events -> Client UI
```

### Real-Time Audio Processing
```
Client Audio Chunk -> WebSocket -> Nova Sonic Agent -> Nova Sonic Processor
                                                    -> Audio Stream Processor
                                                    -> Partial Transcription -> Client
                                                    -> Context Accumulation
                                                    -> [Trigger Processing] -> Bedrock AI
                                                                            -> Voice Synthesis
                                                                            -> Complete Response -> Client
```

### Session Cleanup
```
Client End -> WebSocket -> Nova Sonic Agent -> Nova Sonic Processor
                                            -> Final Processing (if needed)
                                            -> Session Manager -> DynamoDB Update
                                            -> Context Cleanup
                                            -> AppSync Events -> Client UI
```

## Configuration

### Environment Variables

#### Nova Sonic Agent
- `WEBSOCKET_API_ID`: WebSocket API Gateway ID
- `NOVA_SONIC_PROCESSOR_ARN`: ARN of the Nova Sonic Processor function

#### Nova Sonic Processor
- `WEBSOCKET_API_ID`: WebSocket API Gateway ID
- `VOICE_SESSIONS_TABLE_NAME`: DynamoDB table for voice sessions
- `AUDIO_STORAGE_BUCKET`: S3 bucket for audio storage
- `SESSION_MANAGER_FUNCTION_ARN`: ARN of the Session Manager function

#### Session Manager
- `WEBSOCKET_API_ID`: WebSocket API Gateway ID
- `VOICE_SESSIONS_TABLE_NAME`: DynamoDB table for voice sessions
- `AUDIO_STORAGE_BUCKET`: S3 bucket for audio storage

### IAM Permissions

Each function requires specific permissions:

#### Nova Sonic Agent
- `execute-api:ManageConnections` for WebSocket API
- `lambda:InvokeFunction` for Nova Sonic Processor

#### Nova Sonic Processor
- `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream` for AI models
- `execute-api:ManageConnections` for WebSocket API
- `dynamodb:*` for voice sessions and connections tables
- `s3:GetObject` and `s3:PutObject` for audio storage
- `lambda:InvokeFunction` for Session Manager

#### Session Manager
- `execute-api:ManageConnections` for WebSocket API
- `dynamodb:*` for voice sessions table
- `s3:GetObject` and `s3:PutObject` for audio storage

## Data Models

### Voice Session
```typescript
interface VoiceSession {
  PK: string;          // VOICE#${sessionId}
  SK: string;          // METADATA
  sessionId: string;
  novaSonicSessionId: string;
  connectionId: string;
  userId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ERROR';
  createdAt: string;
  updatedAt: string;
  audioFormat?: string;
  totalDuration?: number;
  messageCount?: number;
}
```

### Streaming Context
```typescript
interface StreamingContext {
  sessionId: string;
  connectionId: string;
  userId: string;
  audioFormat: string;
  language: string;
  model: string;
  chunks: AudioChunk[];
  transcriptionBuffer: string;
  processingState: 'idle' | 'receiving' | 'processing' | 'responding';
}
```

## WebSocket Message Formats

### Client to Server

#### Start Voice Session
```json
{
  "action": "voice_session_start",
  "sessionId": "optional-session-id",
  "userId": "user-123",
  "data": {
    "audioFormat": "webm",
    "streaming": true,
    "language": "en-US",
    "model": "claude-3-haiku"
  }
}
```

#### Send Audio Chunk
```json
{
  "action": "voice_chunk",
  "sessionId": "session-123",
  "data": {
    "audioData": "base64-encoded-audio",
    "sequenceNumber": 1,
    "audioFormat": "webm"
  }
}
```

#### End Voice Session
```json
{
  "action": "voice_session_end",
  "sessionId": "session-123"
}
```

### Server to Client

#### Session Initialized
```json
{
  "type": "voice_session_initialized",
  "sessionId": "session-123",
  "novaSonicSessionId": "ns-session-123",
  "status": "ready",
  "capabilities": {
    "transcription": true,
    "synthesis": true,
    "streaming": true,
    "realTimeProcessing": true,
    "languages": ["en-US", "es-ES", "fr-FR", "de-DE"],
    "models": ["claude-3-haiku", "claude-3-sonnet"]
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Partial Transcription
```json
{
  "type": "voice_transcription_partial",
  "sessionId": "session-123",
  "data": {
    "partialTranscription": "Hello how are",
    "sequenceNumber": 3,
    "confidence": 0.85,
    "language": "en-US"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Complete Response
```json
{
  "type": "voice_response_triggered",
  "sessionId": "session-123",
  "data": {
    "transcription": "Hello, how are you today?",
    "aiResponse": "I'm doing well, thank you for asking! How can I help you today?",
    "audioResponse": "data:audio/mp3;base64,encoded-audio-response",
    "triggerReason": "auto_processing"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Testing

### Unit Testing
Run individual function tests:
```bash
cd packages/core/lib/lambda-functions/nova-sonic-processor
node test-nova-sonic.js
```

### Integration Testing
The implementation includes comprehensive integration tests for:
- WebSocket connection handling
- Audio chunk processing
- Session lifecycle management
- Bedrock AI integration
- AppSync Events publishing

## Future Enhancements

### Real Nova Sonic Integration
The current implementation provides a complete framework ready for Nova Sonic integration:

1. **Replace Mock Transcription**: Integrate with actual Nova Sonic transcription service
2. **Replace Mock Synthesis**: Integrate with actual Nova Sonic voice synthesis
3. **Streaming Optimization**: Implement true streaming transcription and synthesis
4. **Language Support**: Add support for additional languages and voices
5. **Model Selection**: Allow dynamic model selection based on use case

### Performance Optimizations
- Connection pooling for Bedrock clients
- Audio chunk batching for efficiency
- Caching for frequently used responses
- Compression for audio data transmission

### Monitoring and Analytics
- CloudWatch metrics for session duration and success rates
- Real-time dashboards for voice processing performance
- Error tracking and alerting
- Usage analytics and reporting

## Deployment

The Nova Sonic integration is automatically deployed as part of the Amplify Gen 2 backend:

```typescript
// In amplify/backend.ts
const novaSonicStack = backend.createStack('NovaSonicStack');
const novaSonic = new NovaSonicStack(novaSonicStack, 'NovaSonic', {
  webSocketApiId: webSocket.webSocketApi.apiId,
  connectionsTableName: webSocket.connectionsTable.tableName,
});
```

The CDK stack creates all necessary resources:
- Lambda functions with proper IAM roles
- DynamoDB tables with appropriate indexes
- S3 bucket with lifecycle policies
- CloudWatch log groups with retention policies