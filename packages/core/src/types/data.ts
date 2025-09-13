/**
 * Data layer types for AIrium
 * Corresponds to DynamoDB models defined in amplify/data/resource.ts
 */

export type UserProfile = 'ADMIN' | 'GENERAL';
export type ApplicationType = 'REST' | 'MCP' | 'INBUILT';
export type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED';
export type MessageType = 'TEXT' | 'VOICE' | 'MEDIA' | 'SYSTEM';
export type VoiceSessionStatus = 'ACTIVE' | 'COMPLETED' | 'ERROR';
export type UploadStatus = 'UPLOADING' | 'COMPLETED' | 'ERROR';
export type MemoryType = 'CONVERSATION' | 'PREFERENCE' | 'CONTEXT' | 'KNOWLEDGE';
export type NotificationType = 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';

// User management
export interface User {
  userId: string;
  email: string;
  profile: UserProfile;
  groups: string[];
  preferences: Record<string, any>;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  groupId: string;
  name: string;
  description?: string;
  applications: string[];
  memberCount: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Application management
export interface Application {
  appId: string;
  type: ApplicationType;
  name: string;
  description?: string;
  config: Record<string, any>;
  remarks?: string;
  groups: string[];
  isActive: boolean;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationConfig {
  // REST application config
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  
  // MCP application config
  transport?: string;
  mcpParams?: Record<string, any>;
  
  // Inbuilt application config
  component?: string;
  props?: Record<string, any>;
}

// WebSocket and real-time communication
export interface Connection {
  connectionId: string;
  userId: string;
  sessionId?: string;
  status: ConnectionStatus;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  lastActivity: string;
  disconnectedAt?: string;
}

// Chat and messaging
export interface ChatSession {
  sessionId: string;
  userId: string;
  connectionId?: string;
  title?: string;
  messageCount: number;
  context: Record<string, any>;
  metadata: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  messageId: string;
  sessionId: string;
  userId: string;
  type: MessageType;
  content: string;
  metadata: Record<string, any>;
  voiceSessionId?: string;
  mediaUrls: string[];
  aiResponse?: Record<string, any>;
  timestamp: string;
  editedAt?: string;
}

// Voice interaction
export interface VoiceSession {
  sessionId: string;
  novaSonicSessionId?: string;
  connectionId: string;
  userId: string;
  chatSessionId?: string;
  status: VoiceSessionStatus;
  audioFormat: string;
  duration: number;
  transcription?: string;
  aiResponse?: Record<string, any>;
  createdAt: string;
  completedAt?: string;
}

// Media management
export interface MediaFile {
  fileId: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  s3Bucket: string;
  uploadStatus: UploadStatus;
  isPublic: boolean;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// User memory and context
export interface UserMemory {
  memoryId: string;
  userId: string;
  type: MemoryType;
  content: Record<string, any>;
  embedding?: string;
  relevanceScore?: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Analytics and usage tracking
export interface ApplicationUsage {
  usageId: string;
  userId: string;
  applicationId: string;
  sessionId?: string;
  action: string;
  parameters: Record<string, any>;
  response?: Record<string, any>;
  duration?: number;
  success: boolean;
  errorMessage?: string;
  timestamp: string;
}

// Notifications and UI control
export interface Notification {
  notificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  isRead: boolean;
  isPersistent: boolean;
  expiresAt?: string;
  createdAt: string;
}

// Data access patterns and queries
export interface DataQueryOptions {
  limit?: number;
  nextToken?: string;
  filter?: Record<string, any>;
  sortDirection?: 'ASC' | 'DESC';
}

export interface DataQueryResult<T> {
  items: T[];
  nextToken?: string;
  scannedCount?: number;
}

// Create/Update request types
export interface CreateUserRequest {
  email: string;
  profile?: UserProfile;
  groups?: string[];
  preferences?: Record<string, any>;
}

export interface UpdateUserRequest {
  userId: string;
  email?: string;
  profile?: UserProfile;
  groups?: string[];
  preferences?: Record<string, any>;
  lastLoginAt?: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  applications?: string[];
  isDefault?: boolean;
}

export interface UpdateGroupRequest {
  groupId: string;
  name?: string;
  description?: string;
  applications?: string[];
  memberCount?: number;
}

export interface CreateApplicationRequest {
  type: ApplicationType;
  name: string;
  description?: string;
  config: ApplicationConfig;
  remarks?: string;
  groups?: string[];
  version?: string;
}

export interface UpdateApplicationRequest {
  appId: string;
  name?: string;
  description?: string;
  config?: ApplicationConfig;
  remarks?: string;
  groups?: string[];
  isActive?: boolean;
  version?: string;
}

export interface CreateChatSessionRequest {
  userId: string;
  connectionId?: string;
  title?: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface CreateChatMessageRequest {
  sessionId: string;
  userId: string;
  type: MessageType;
  content: string;
  metadata?: Record<string, any>;
  voiceSessionId?: string;
  mediaUrls?: string[];
  aiResponse?: Record<string, any>;
}

export interface CreateVoiceSessionRequest {
  connectionId: string;
  userId: string;
  chatSessionId?: string;
  audioFormat?: string;
  novaSonicSessionId?: string;
}

export interface CreateMediaFileRequest {
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  s3Bucket: string;
  isPublic?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface CreateUserMemoryRequest {
  userId: string;
  type: MemoryType;
  content: Record<string, any>;
  embedding?: string;
  relevanceScore?: number;
  expiresAt?: string;
}

export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isPersistent?: boolean;
  expiresAt?: string;
}

// Error types for data operations
export enum DataErrorType {
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DUPLICATE_KEY = 'DUPLICATE_KEY',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class DataError extends Error {
  constructor(
    public type: DataErrorType,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'DataError';
  }
}