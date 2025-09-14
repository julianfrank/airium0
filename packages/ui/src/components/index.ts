// UI Components
export { Button } from './ui/button';
export { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';

// Authentication Components
export { 
  AuthProvider, 
  useAuth, 
  LoginForm, 
  UserProfile, 
  ProtectedRoute, 
  AuthenticatedHeader, 
  RoleBasedNavigation,
  AuthWrapper
} from './auth';
export type { User, AuthContextType } from './auth';

// Layout Components
export { Header } from './layout/Header';
export { AdminSidebar } from './layout/AdminSidebar';
export { ResponsiveContainer } from './layout/ResponsiveContainer';

// WebSocket Components
export { 
  WebSocketProvider, 
  useWebSocketContext, 
  WebSocketStatus 
} from './websocket';
export type { WebSocketProviderProps, WebSocketStatusProps } from './websocket';

// AppSync Components
export {
  EventSubscriptions,
  SubscriptionStatus,
  VoiceSessionEvents,
  ChatEvents,
  UIControlEvents,
  SubscriptionProvider,
  useSubscriptionContext,
  SubscriptionProviderStatus,
  withSubscriptions
} from './appsync';
export type {
  EventSubscriptionsProps,
  SubscriptionStatusProps,
  VoiceSessionEventsProps,
  ChatEventsProps,
  UIControlEventsProps,
  SubscriptionProviderProps,
  SubscriptionContextValue,
  SubscriptionProviderStatusProps
} from './appsync';

// Voice Components
export {
  VoiceChat,
  AudioStreamer,
  VoiceSessionManager,
  VoiceFeedback,
  AudioVisualizer
} from './voice';
export type {
  VoiceChatProps,
  VoiceChatState,
  AudioStreamerProps,
  AudioStreamerRef,
  VoiceSessionManagerProps,
  VoiceSessionManagerRef,
  VoiceFeedbackProps,
  AudioVisualizerProps
} from './voice';

// Chat Components
export {
  ChatInterface,
  ChatMessage,
  ChatInput,
  ChatHistory,
  AIResponseHandler
} from './chat';
export type {
  ChatInterfaceProps,
  ChatMessageProps,
  ChatInputProps,
  ChatHistoryProps,
  AIResponseHandlerProps,
  ChatState,
  Message
} from './chat';

// Utilities
export { cn } from '../lib/utils';