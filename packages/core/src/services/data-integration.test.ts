/**
 * Integration tests for data service
 * Tests the data layer types and service instantiation
 */

import { SimpleDataService } from './simple-data-service';
import {
  User,
  Group,
  Application,
  ChatSession,
  ChatMessage,
  VoiceSession,
  MediaFile,
  UserMemory,
  Notification,
  CreateUserRequest,
  CreateGroupRequest,
  CreateApplicationRequest,
  DataErrorType,
  ApplicationType,
  MessageType,
  VoiceSessionStatus,
  UploadStatus,
  MemoryType,
  NotificationType,
} from '../types/data';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { describe } from 'vitest';

describe('Data Service Integration', () => {
  test('SimpleDataService can be instantiated', () => {
    const dataService = new SimpleDataService();
    expect(dataService).toBeInstanceOf(SimpleDataService);
  });

  test('User type is properly defined', () => {
    const user: User = {
      userId: 'user-123',
      email: 'test@example.com',
      profile: 'GENERAL',
      groups: ['GENERAL'],
      preferences: { theme: 'dark' },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    expect(user.profile).toBe('GENERAL');
    expect(user.groups).toContain('GENERAL');
    expect(user.preferences.theme).toBe('dark');
  });

  test('CreateUserRequest type is properly defined', () => {
    const createRequest: CreateUserRequest = {
      email: 'test@example.com',
      profile: 'ADMIN',
      groups: ['ADMIN', 'DEVELOPERS'],
      preferences: { notifications: true },
    };

    expect(createRequest.profile).toBe('ADMIN');
    expect(createRequest.groups).toContain('ADMIN');
    expect(createRequest.preferences?.notifications).toBe(true);
  });

  test('Group type is properly defined', () => {
    const group: Group = {
      groupId: 'group-123',
      name: 'Developers',
      description: 'Development team',
      applications: ['app-1', 'app-2'],
      memberCount: 5,
      isDefault: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    expect(group.name).toBe('Developers');
    expect(group.applications).toHaveLength(2);
    expect(group.isDefault).toBe(false);
  });

  test('Application type is properly defined', () => {
    const application: Application = {
      appId: 'app-123',
      type: 'REST',
      name: 'Weather API',
      description: 'Get weather information',
      config: {
        url: 'https://api.weather.com',
        method: 'GET',
        headers: { 'API-Key': 'secret' },
      },
      groups: ['GENERAL'],
      isActive: true,
      version: '1.0.0',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    expect(application.type).toBe('REST');
    expect(application.config.url).toBe('https://api.weather.com');
    expect(application.isActive).toBe(true);
  });

  test('ChatSession type is properly defined', () => {
    const chatSession: ChatSession = {
      sessionId: 'session-123',
      userId: 'user-123',
      connectionId: 'conn-123',
      title: 'Weather Discussion',
      messageCount: 5,
      context: { topic: 'weather' },
      metadata: { source: 'web' },
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    expect(chatSession.title).toBe('Weather Discussion');
    expect(chatSession.messageCount).toBe(5);
    expect(chatSession.context.topic).toBe('weather');
  });

  test('ChatMessage type is properly defined', () => {
    const chatMessage: ChatMessage = {
      messageId: 'msg-123',
      sessionId: 'session-123',
      userId: 'user-123',
      type: 'TEXT',
      content: 'What is the weather like today?',
      metadata: { sentiment: 'neutral' },
      mediaUrls: [],
      aiResponse: { confidence: 0.95 },
      timestamp: '2024-01-01T00:00:00Z',
    };

    expect(chatMessage.type).toBe('TEXT');
    expect(chatMessage.content).toContain('weather');
    expect(chatMessage.aiResponse?.confidence).toBe(0.95);
  });

  test('VoiceSession type is properly defined', () => {
    const voiceSession: VoiceSession = {
      sessionId: 'voice-123',
      novaSonicSessionId: 'nova-123',
      connectionId: 'conn-123',
      userId: 'user-123',
      chatSessionId: 'session-123',
      status: 'ACTIVE',
      audioFormat: 'webm',
      duration: 30,
      transcription: 'Hello, how are you?',
      createdAt: '2024-01-01T00:00:00Z',
    };

    expect(voiceSession.status).toBe('ACTIVE');
    expect(voiceSession.audioFormat).toBe('webm');
    expect(voiceSession.duration).toBe(30);
  });

  test('MediaFile type is properly defined', () => {
    const mediaFile: MediaFile = {
      fileId: 'file-123',
      userId: 'user-123',
      fileName: 'document.pdf',
      fileType: 'document',
      fileSize: 1024000,
      mimeType: 'application/pdf',
      s3Key: 'users/user-123/documents/document.pdf',
      s3Bucket: 'airium-media',
      uploadStatus: 'COMPLETED',
      isPublic: false,
      tags: ['important', 'work'],
      metadata: { pages: 10 },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    expect(mediaFile.fileName).toBe('document.pdf');
    expect(mediaFile.uploadStatus).toBe('COMPLETED');
    expect(mediaFile.tags).toContain('important');
    expect(mediaFile.metadata.pages).toBe(10);
  });

  test('UserMemory type is properly defined', () => {
    const userMemory: UserMemory = {
      memoryId: 'memory-123',
      userId: 'user-123',
      type: 'CONVERSATION',
      content: { summary: 'User prefers morning meetings' },
      embedding: 'vector-data-here',
      relevanceScore: 0.85,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    expect(userMemory.type).toBe('CONVERSATION');
    expect(userMemory.content.summary).toContain('morning meetings');
    expect(userMemory.relevanceScore).toBe(0.85);
  });

  test('Notification type is properly defined', () => {
    const notification: Notification = {
      notificationId: 'notif-123',
      userId: 'user-123',
      type: 'INFO',
      title: 'Welcome to AIrium',
      message: 'Your account has been created successfully',
      data: { action: 'welcome' },
      isRead: false,
      isPersistent: true,
      createdAt: '2024-01-01T00:00:00Z',
    };

    expect(notification.type).toBe('INFO');
    expect(notification.title).toBe('Welcome to AIrium');
    expect(notification.isPersistent).toBe(true);
  });

  test('Enum types are properly defined', () => {
    const appTypes: ApplicationType[] = ['REST', 'MCP', 'INBUILT'];
    const messageTypes: MessageType[] = ['TEXT', 'VOICE', 'MEDIA', 'SYSTEM'];
    const voiceStatuses: VoiceSessionStatus[] = ['ACTIVE', 'COMPLETED', 'ERROR'];
    const uploadStatuses: UploadStatus[] = ['UPLOADING', 'COMPLETED', 'ERROR'];
    const memoryTypes: MemoryType[] = ['CONVERSATION', 'PREFERENCE', 'CONTEXT', 'KNOWLEDGE'];
    const notificationTypes: NotificationType[] = ['INFO', 'WARNING', 'ERROR', 'SUCCESS'];

    expect(appTypes).toContain('REST');
    expect(messageTypes).toContain('TEXT');
    expect(voiceStatuses).toContain('ACTIVE');
    expect(uploadStatuses).toContain('COMPLETED');
    expect(memoryTypes).toContain('CONVERSATION');
    expect(notificationTypes).toContain('INFO');
  });

  test('DataErrorType enum is defined', () => {
    expect(DataErrorType.NOT_FOUND).toBe('NOT_FOUND');
    expect(DataErrorType.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(DataErrorType.PERMISSION_DENIED).toBe('PERMISSION_DENIED');
    expect(DataErrorType.DUPLICATE_KEY).toBe('DUPLICATE_KEY');
    expect(DataErrorType.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
  });

  test('Create request types are properly defined', () => {
    const createGroup: CreateGroupRequest = {
      name: 'Test Group',
      description: 'A test group',
      applications: ['app-1'],
      isDefault: false,
    };

    const createApp: CreateApplicationRequest = {
      type: 'REST',
      name: 'Test API',
      description: 'A test API',
      config: { url: 'https://api.test.com' },
      groups: ['GENERAL'],
      version: '1.0.0',
    };

    expect(createGroup.name).toBe('Test Group');
    expect(createApp.type).toBe('REST');
    expect(createApp.config.url).toBe('https://api.test.com');
  });
});