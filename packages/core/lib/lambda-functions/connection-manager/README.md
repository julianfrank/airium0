# Connection Manager

This Lambda function provides administrative operations for managing WebSocket connections in the AIrium platform.

## Overview

The Connection Manager handles:
- Querying active connections by user
- Retrieving all active connections
- Updating connection status
- Cleaning up stale connections

## Operations

### Get User Connections

Retrieves all active connections for a specific user.

**Event:**
```json
{
  "action": "get_user_connections",
  "userId": "user-123"
}
```

**Response:**
```json
{
  "statusCode": 200,
  "body": {
    "connections": [
      {
        "connectionId": "conn-123",
        "userId": "user-123",
        "status": "CONNECTED",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "count": 1
  }
}
```

### Get All Connections

Retrieves all active connections across all users.

**Event:**
```json
{
  "action": "get_all_connections"
}
```

### Update Connection Status

Updates the status of a specific connection.

**Event:**
```json
{
  "action": "update_connection_status",
  "connectionId": "conn-123",
  "status": "DISCONNECTED"
}
```

### Cleanup Stale Connections

Identifies and marks connections as disconnected if they haven't been active for more than 1 hour.

**Event:**
```json
{
  "action": "cleanup_stale_connections"
}
```

**Response:**
```json
{
  "statusCode": 200,
  "body": {
    "message": "Stale connections cleaned up",
    "cleanedCount": 5
  }
}
```

## Environment Variables

- `CONNECTIONS_TABLE_NAME`: DynamoDB table for connection storage

## Database Schema

The connection manager operates on the connections table with:
- **Primary Key**: `connectionId` (String)
- **GSI**: `UserIdIndex` with partition key `userId` and sort key `status`

## Error Handling

- Validates required parameters
- Handles DynamoDB operation failures
- Returns appropriate HTTP status codes
- Logs errors for debugging

## Usage Patterns

### Scheduled Cleanup

The cleanup operation can be scheduled using EventBridge:

```typescript
new events.Rule(this, 'CleanupRule', {
  schedule: events.Schedule.rate(Duration.hours(1)),
  targets: [new targets.LambdaFunction(connectionManager)]
});
```

### Admin Dashboard

The connection manager can be used to build admin dashboards:

```javascript
// Get all active connections
const response = await lambda.invoke({
  FunctionName: 'connection-manager',
  Payload: JSON.stringify({
    action: 'get_all_connections'
  })
}).promise();

const { connections, count } = JSON.parse(response.Payload);
console.log(`${count} active connections`);
```

### User Session Management

Track user sessions across multiple devices:

```javascript
// Get user's connections
const userConnections = await lambda.invoke({
  FunctionName: 'connection-manager',
  Payload: JSON.stringify({
    action: 'get_user_connections',
    userId: 'user-123'
  })
}).promise();
```

## Testing

Comprehensive test coverage includes:
- All CRUD operations
- Error scenarios
- Edge cases (empty results, invalid parameters)
- Connection lifecycle management

Run tests with:
```bash
npm test src/test/connection-manager.test.ts
```

## Integration

The Connection Manager integrates with:
- **WebSocket Handler**: For connection state updates
- **Admin UI**: For connection monitoring
- **EventBridge**: For scheduled cleanup
- **CloudWatch**: For monitoring and alerting

## Monitoring

Key metrics to monitor:
- Active connection count
- Stale connection cleanup frequency
- Error rates
- Response times

## Security

- No direct user access (internal service only)
- IAM-based access control
- Input validation
- Audit logging