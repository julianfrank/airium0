import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/**
 * AIrium Data Schema
 * Comprehensive data models for users, groups, applications, chat, and media
 * Requirements: 7.1, 7.2, 7.4, 10.3
 */
const schema = a.schema({
  // User management data model
  User: a
    .model({
      email: a.string().required(),
      profile: a.enum(['ADMIN', 'GENERAL']),
      groups: a.string().array(),
      preferences: a.json(),
      lastLoginAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.group('ADMIN').to(['create', 'read', 'update', 'delete']),
      allow.owner().to(['read', 'update']),
    ]),

  // Group management data model
  Group: a
    .model({
      name: a.string().required(),
      description: a.string(),
      applications: a.string().array(),
      memberCount: a.integer(),
      isDefault: a.boolean(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.group('ADMIN').to(['create', 'read', 'update', 'delete']),
    ]),

  // Application management data model
  Application: a
    .model({
      type: a.enum(['REST', 'MCP', 'INBUILT']),
      name: a.string().required(),
      description: a.string(),
      config: a.json().required(),
      remarks: a.string(),
      groups: a.string().array(),
      isActive: a.boolean(),
      version: a.string(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.group('ADMIN').to(['create', 'read', 'update', 'delete']),
    ]),

  // WebSocket connection management
  Connection: a
    .model({
      userId: a.string().required(),
      sessionId: a.string(),
      status: a.enum(['CONNECTED', 'DISCONNECTED']),
      ipAddress: a.string(),
      userAgent: a.string(),
      lastActivity: a.datetime(),
      disconnectedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.owner().to(['create', 'read', 'update', 'delete']),
      allow.group('ADMIN').to(['read']),
    ]),

  // Chat session and message management
  ChatSession: a
    .model({
      userId: a.string().required(),
      connectionId: a.string(),
      title: a.string(),
      messageCount: a.integer(),
      context: a.json(),
      metadata: a.json(),
      isActive: a.boolean(),
    })
    .authorization((allow) => [
      allow.owner().to(['create', 'read', 'update', 'delete']),
      allow.group('ADMIN').to(['read']),
    ]),

  // Individual chat messages
  ChatMessage: a
    .model({
      sessionId: a.string().required(),
      userId: a.string().required(),
      type: a.enum(['TEXT', 'VOICE', 'MEDIA', 'SYSTEM']),
      content: a.string().required(),
      metadata: a.json(),
      voiceSessionId: a.string(),
      mediaUrls: a.string().array(),
      aiResponse: a.json(),
      timestamp: a.datetime().required(),
      editedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner().to(['create', 'read', 'update', 'delete']),
      allow.group('ADMIN').to(['read']),
    ]),

  // Voice session management for Nova Sonic
  VoiceSession: a
    .model({
      novaSonicSessionId: a.string(),
      connectionId: a.string().required(),
      userId: a.string().required(),
      chatSessionId: a.string(),
      status: a.enum(['ACTIVE', 'COMPLETED', 'ERROR']),
      audioFormat: a.string(),
      duration: a.integer(),
      transcription: a.string(),
      aiResponse: a.json(),
      completedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner().to(['create', 'read', 'update', 'delete']),
      allow.group('ADMIN').to(['read']),
    ]),

  // Media file metadata and management
  MediaFile: a
    .model({
      userId: a.string().required(),
      fileName: a.string().required(),
      fileType: a.string().required(),
      fileSize: a.integer().required(),
      mimeType: a.string().required(),
      s3Key: a.string().required(),
      s3Bucket: a.string().required(),
      uploadStatus: a.enum(['UPLOADING', 'COMPLETED', 'ERROR']),
      isPublic: a.boolean(),
      tags: a.string().array(),
      metadata: a.json(),
    })
    .authorization((allow) => [
      allow.owner().to(['create', 'read', 'update', 'delete']),
      allow.group('ADMIN').to(['read']),
    ]),

  // User memory and context storage
  UserMemory: a
    .model({
      userId: a.string().required(),
      type: a.enum(['CONVERSATION', 'PREFERENCE', 'CONTEXT', 'KNOWLEDGE']),
      content: a.json().required(),
      embedding: a.string(), // For vector storage integration
      relevanceScore: a.float(),
      expiresAt: a.datetime(),
      isActive: a.boolean(),
    })
    .authorization((allow) => [
      allow.owner().to(['create', 'read', 'update', 'delete']),
      allow.group('ADMIN').to(['read']),
    ]),

  // Application usage analytics
  ApplicationUsage: a
    .model({
      userId: a.string().required(),
      applicationId: a.string().required(),
      sessionId: a.string(),
      action: a.string().required(),
      parameters: a.json(),
      response: a.json(),
      duration: a.integer(),
      success: a.boolean(),
      errorMessage: a.string(),
      timestamp: a.datetime().required(),
    })
    .authorization((allow) => [
      allow.owner().to(['create', 'read']),
      allow.group('ADMIN').to(['create', 'read', 'update', 'delete']),
    ]),

  // System notifications and UI control
  Notification: a
    .model({
      userId: a.string().required(),
      type: a.enum(['INFO', 'WARNING', 'ERROR', 'SUCCESS']),
      title: a.string().required(),
      message: a.string().required(),
      data: a.json(),
      isRead: a.boolean(),
      isPersistent: a.boolean(),
      expiresAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner().to(['create', 'read', 'update', 'delete']),
      allow.group('ADMIN').to(['create', 'read', 'update', 'delete']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});