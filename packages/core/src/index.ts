/**
 * Core module exports
 * Authentication and backend services for AIrium
 */

// Authentication services
export { AuthService } from './services/auth-service';

// Data services
export { SimpleDataService } from './services/simple-data-service';

// Connection management
export { ConnectionManager } from './services/connection-manager';
export type { ConnectionInfo, WebSocketMessage } from './services/connection-manager';

// WebSocket client utilities
export { WebSocketClient } from './utils/websocket-client';
export type { WebSocketClientOptions, WebSocketClientEvents } from './utils/websocket-client';

// Types
export * from './types/auth';
export type {
  ApplicationType,
  MessageType,
  VoiceSessionStatus,
  UploadStatus,
  MemoryType,
  NotificationType,
} from './types/data';
export {
  DataError,
  DataErrorType,
} from './types/data';

// Re-export backend configuration
export { backend } from '../amplify/backend';