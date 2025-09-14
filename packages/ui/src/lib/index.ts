// WebSocket utilities
export { WebSocketClient, WebSocketState } from './websocket-client.js';
export { ConnectionManager } from './connection-manager.js';
export { useWebSocket } from './use-websocket.js';

// AppSync GraphQL utilities
export { 
  appSyncClient, 
  initializeAppSyncClient, 
  getAppSyncClient, 
  isAppSyncClientReady 
} from './appsync-client';
export { subscriptionManager } from './subscription-manager';
export {
  useEventSubscription,
  useVoiceSessionSubscription,
  useChatSubscription,
  useUIControlSubscription,
  useNotesSubscription,
  useUserSubscriptions,
  useSubscriptionManager
} from './use-appsync-subscriptions';

// GraphQL queries and mutations
export * from './graphql/queries';

// Amplify configuration
export { configureAmplify, Amplify } from './amplify';

// Other utilities
export { cn } from './utils.js';

// Types
export type { 
  WebSocketClientConfig, 
  WebSocketClientEvents 
} from './websocket-client.js';
export type { 
  ConnectionManagerConfig, 
  ConnectionState, 
  MessageHandler, 
  ConnectionStateHandler 
} from './connection-manager.js';
export type { 
  UseWebSocketOptions, 
  UseWebSocketReturn 
} from './use-websocket.js';
export type {
  AppSyncClientConfig
} from './appsync-client';
export type {
  EventHandler,
  ErrorHandler,
  ConnectionHandler,
  SubscriptionOptions,
  ActiveSubscription
} from './subscription-manager';
export type {
  UseSubscriptionResult
} from './use-appsync-subscriptions';