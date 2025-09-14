import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
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
  ApplicationUsage,
  Connection,
  CreateUserRequest,
  CreateGroupRequest,
  CreateApplicationRequest,
  CreateChatSessionRequest,
  CreateChatMessageRequest,
  CreateVoiceSessionRequest,
  CreateMediaFileRequest,
  CreateUserMemoryRequest,
  CreateNotificationRequest,
  DataQueryOptions,
  DataQueryResult,
  DataError,
  DataErrorType,
} from '../types/data';

/**
 * Comprehensive Data Service for AIrium
 * Implements data access patterns with proper IAM permissions
 * Requirements: 7.1, 7.2, 7.4, 10.3
 */
export class DataService {
  private client = generateClient<Schema>();

  // User Management Operations
  async createUser(request: CreateUserRequest): Promise<User> {
    try {
      const result = await this.client.models.User.create({
        email: [request.email],
        profile: [request.profile || 'GENERAL'],
        groups: request.groups || ['GENERAL'],
        preferences: [JSON.stringify(request.preferences || {})],
      });

      if (!result.data) {
        throw new DataError(DataErrorType.INTERNAL_ERROR, 'Failed to create user');
      }

      return this.mapUserFromSchema(result.data);
    } catch (error) {
      console.error('Error creating user:', error);
      throw this.handleError(error);
    }
  }

  async getUserById(userId: string): Promise<User> {
    try {
      const result = await this.client.models.User.get({ id: userId });

      if (!result.data) {
        throw new DataError(DataErrorType.NOT_FOUND, `User with ID ${userId} not found`);
      }

      return this.mapUserFromSchema(result.data);
    } catch (error) {
      console.error('Error getting user:', error);
      throw this.handleError(error);
    }
  }

  async listUsers(options?: DataQueryOptions): Promise<DataQueryResult<User>> {
    try {
      const result = await this.client.models.User.list({
        limit: options?.limit,
        nextToken: options?.nextToken,
      });

      return {
        items: result.data.map(user => this.mapUserFromSchema(user)),
        nextToken: result.nextToken,
      };
    } catch (error) {
      console.error('Error listing users:', error);
      throw this.handleError(error);
    }
  }

  async updateUserLastLogin(userId: string): Promise<User> {
    try {
      const result = await this.client.models.User.update({
        id: userId,
        lastLoginAt: [new Date().toISOString()],
      } as any);

      if (!result.data) {
        throw new DataError(DataErrorType.NOT_FOUND, `User with ID ${userId} not found`);
      }

      return this.mapUserFromSchema(result.data);
    } catch (error) {
      console.error('Error updating user login:', error);
      throw this.handleError(error);
    }
  }

  // Group Management Operations
  async createGroup(request: CreateGroupRequest): Promise<Group> {
    try {
      const result = await this.client.models.Group.create({
        name: [request.name],
        description: [request.description],
        applications: request.applications || [],
        memberCount: ['0'],
        isDefault: [request.isDefault ? 'true' : 'false'],
      });

      if (!result.data) {
        throw new DataError(DataErrorType.INTERNAL_ERROR, 'Failed to create group');
      }

      return this.mapGroupFromSchema(result.data);
    } catch (error) {
      console.error('Error creating group:', error);
      throw this.handleError(error);
    }
  }

  async listGroups(): Promise<Group[]> {
    try {
      const result = await this.client.models.Group.list();
      return result.data.map(group => this.mapGroupFromSchema(group));
    } catch (error) {
      console.error('Error listing groups:', error);
      throw this.handleError(error);
    }
  }

  // Application Management Operations
  async createApplication(request: CreateApplicationRequest): Promise<Application> {
    try {
      const result = await this.client.models.Application.create({
        type: [request.type],
        name: [request.name],
        description: [request.description],
        config: [JSON.stringify(request.config)],
        remarks: [request.remarks],
        groups: request.groups || [],
        isActive: ['true'],
        version: [request.version || '1.0.0'],
      });

      if (!result.data) {
        throw new DataError(DataErrorType.INTERNAL_ERROR, 'Failed to create application');
      }

      return this.mapApplicationFromSchema(result.data);
    } catch (error) {
      console.error('Error creating application:', error);
      throw this.handleError(error);
    }
  }

  async getApplicationsByGroups(groups: string[]): Promise<Application[]> {
    try {
      const result = await this.client.models.Application.list();

      // Filter applications that have at least one matching group
      const filteredApps = result.data.filter(app =>
        app.groups && app.groups.some(group => groups.includes(group))
      );

      return filteredApps.map(app => this.mapApplicationFromSchema(app));
    } catch (error) {
      console.error('Error getting applications by groups:', error);
      throw this.handleError(error);
    }
  }

  async listApplications(): Promise<Application[]> {
    try {
      const result = await this.client.models.Application.list();
      return result.data.map(app => this.mapApplicationFromSchema(app));
    } catch (error) {
      console.error('Error listing applications:', error);
      throw this.handleError(error);
    }
  }

  // Chat Session Operations
  async createChatSession(request: CreateChatSessionRequest): Promise<ChatSession> {
    try {
      const result = await this.client.models.ChatSession.create({
        userId: [request.userId],
        connectionId: [request.connectionId],
        title: [request.title],
        messageCount: ['0'],
        context: [JSON.stringify(request.context || {})],
        metadata: [JSON.stringify(request.metadata || {})],
        isActive: ['true'],
      });

      if (!result.data) {
        throw new DataError(DataErrorType.INTERNAL_ERROR, 'Failed to create chat session');
      }

      return this.mapChatSessionFromSchema(result.data);
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw this.handleError(error);
    }
  }

  async getChatSessionsByUser(userId: string): Promise<ChatSession[]> {
    try {
      const result = await this.client.models.ChatSession.list({
        filter: { userId: { eq: userId } },
      });

      return result.data.map(session => this.mapChatSessionFromSchema(session));
    } catch (error) {
      console.error('Error getting chat sessions by user:', error);
      throw this.handleError(error);
    }
  }

  // Chat Message Operations
  async createChatMessage(request: CreateChatMessageRequest): Promise<ChatMessage> {
    try {
      const result = await this.client.models.ChatMessage.create({
        sessionId: [request.sessionId],
        userId: [request.userId],
        type: [request.type],
        content: [request.content],
        metadata: [JSON.stringify(request.metadata || {})],
        voiceSessionId: request.voiceSessionId ? [request.voiceSessionId] : undefined,
        mediaUrls: request.mediaUrls || [],
        aiResponse: request.aiResponse ? [JSON.stringify(request.aiResponse)] : undefined,
        timestamp: [new Date().toISOString()],
      });

      if (!result.data) {
        throw new DataError(DataErrorType.INTERNAL_ERROR, 'Failed to create chat message');
      }

      // Increment session message count
      await this.incrementChatSessionMessageCount(request.sessionId);

      return this.mapChatMessageFromSchema(result.data);
    } catch (error) {
      console.error('Error creating chat message:', error);
      throw this.handleError(error);
    }
  }

  async getChatMessagesBySession(sessionId: string): Promise<ChatMessage[]> {
    try {
      const result = await this.client.models.ChatMessage.list({
        filter: { sessionId: { eq: sessionId } },
      });

      return result.data
        .map(message => this.mapChatMessageFromSchema(message))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (error) {
      console.error('Error getting chat messages by session:', error);
      throw this.handleError(error);
    }
  }

  private async incrementChatSessionMessageCount(sessionId: string): Promise<void> {
    try {
      // Get current session
      const session = await this.client.models.ChatSession.get({ id: sessionId });
      if (session.data) {
        await this.client.models.ChatSession.update({
          id: sessionId,
          messageCount: [String((session.data.messageCount || 0) + 1)],
        } as any);
      }
    } catch (error) {
      // Log error but don't fail the main operation
      console.warn('Failed to increment message count:', error);
    }
  }

  // Voice Session Operations
  async createVoiceSession(request: CreateVoiceSessionRequest): Promise<VoiceSession> {
    try {
      const result = await this.client.models.VoiceSession.create({
        connectionId: [request.connectionId],
        userId: [request.userId],
        chatSessionId: [request.chatSessionId],
        novaSonicSessionId: [request.novaSonicSessionId],
        status: ['ACTIVE'],
        audioFormat: [request.audioFormat || 'webm'],
        duration: ['0'],
      });

      if (!result.data) {
        throw new DataError(DataErrorType.INTERNAL_ERROR, 'Failed to create voice session');
      }

      return this.mapVoiceSessionFromSchema(result.data);
    } catch (error) {
      console.error('Error creating voice session:', error);
      throw this.handleError(error);
    }
  }

  // Media File Operations
  async createMediaFile(request: CreateMediaFileRequest): Promise<MediaFile> {
    try {
      const result = await this.client.models.MediaFile.create({
        userId: [request.userId],
        fileName: [request.fileName],
        fileType: [request.fileType],
        fileSize: [String(request.fileSize)],
        mimeType: [request.mimeType],
        s3Key: [request.s3Key],
        s3Bucket: [request.s3Bucket],
        uploadStatus: ['UPLOADING'],
        isPublic: [request.isPublic ? 'true' : 'false'],
        tags: request.tags || [],
        metadata: [JSON.stringify(request.metadata || {})],
      });

      if (!result.data) {
        throw new DataError(DataErrorType.INTERNAL_ERROR, 'Failed to create media file');
      }

      return this.mapMediaFileFromSchema(result.data);
    } catch (error) {
      console.error('Error creating media file:', error);
      throw this.handleError(error);
    }
  }

  async getMediaFilesByUser(userId: string): Promise<MediaFile[]> {
    try {
      const result = await this.client.models.MediaFile.list({
        filter: { userId: { eq: userId } },
      });

      return result.data.map(file => this.mapMediaFileFromSchema(file));
    } catch (error) {
      console.error('Error getting media files by user:', error);
      throw this.handleError(error);
    }
  }

  // User Memory Operations
  async createUserMemory(request: CreateUserMemoryRequest): Promise<UserMemory> {
    try {
      const result = await this.client.models.UserMemory.create({
        userId: [request.userId],
        type: [request.type],
        content: [JSON.stringify(request.content)],
        embedding: request.embedding ? [JSON.stringify(request.embedding)] : undefined,
        relevanceScore: [String(request.relevanceScore)],
        expiresAt: request.expiresAt ? [request.expiresAt] : undefined,
        isActive: ['true'],
      });

      if (!result.data) {
        throw new DataError(DataErrorType.INTERNAL_ERROR, 'Failed to create user memory');
      }

      return this.mapUserMemoryFromSchema(result.data);
    } catch (error) {
      console.error('Error creating user memory:', error);
      throw this.handleError(error);
    }
  }

  async getUserMemoriesByUser(userId: string): Promise<UserMemory[]> {
    try {
      const result = await this.client.models.UserMemory.list({
        filter: { userId: { eq: userId } },
      });

      return result.data.map(memory => this.mapUserMemoryFromSchema(memory));
    } catch (error) {
      console.error('Error getting user memories:', error);
      throw this.handleError(error);
    }
  }

  // Notification Operations
  async createNotification(request: CreateNotificationRequest): Promise<Notification> {
    try {
      const result = await this.client.models.Notification.create({
        userId: [request.userId],
        type: [request.type],
        title: [request.title],
        message: [request.message],
        data: [JSON.stringify(request.data || {})],
        isRead: ['false'],
        isPersistent: [request.isPersistent ? 'true' : 'false'],
        expiresAt: request.expiresAt ? [request.expiresAt] : undefined,
      });

      if (!result.data) {
        throw new DataError(DataErrorType.INTERNAL_ERROR, 'Failed to create notification');
      }

      return this.mapNotificationFromSchema(result.data);
    } catch (error) {
      console.error('Error creating notification:', error);
      throw this.handleError(error);
    }
  }

  // Connection Management Operations
  async createConnection(userId: string, sessionId?: string): Promise<Connection> {
    try {
      const result = await this.client.models.Connection.create({
        userId: [userId],
        sessionId: sessionId ? [sessionId] : undefined,
        status: ['CONNECTED'],
        lastActivity: [new Date().toISOString()],
      });

      if (!result.data) {
        throw new DataError(DataErrorType.INTERNAL_ERROR, 'Failed to create connection');
      }

      return this.mapConnectionFromSchema(result.data);
    } catch (error) {
      console.error('Error creating connection:', error);
      throw this.handleError(error);
    }
  }

  // Mapping functions to convert schema types to domain types
  private mapUserFromSchema(user: any): User {
    return {
      userId: user.id,
      email: Array.isArray(user.email) ? user.email[0] : user.email,
      profile: Array.isArray(user.profile) ? user.profile[0] : user.profile,
      groups: user.groups || [],
      preferences: Array.isArray(user.preferences) ? JSON.parse(user.preferences[0] || '{}') : user.preferences || {},
      lastLoginAt: Array.isArray(user.lastLoginAt) ? user.lastLoginAt[0] : user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private mapGroupFromSchema(group: any): Group {
    return {
      groupId: group.id,
      name: Array.isArray(group.name) ? group.name[0] : group.name,
      description: Array.isArray(group.description) ? group.description[0] : group.description,
      applications: group.applications || [],
      memberCount: Array.isArray(group.memberCount) ? parseInt(group.memberCount[0]) : group.memberCount || 0,
      isDefault: Array.isArray(group.isDefault) ? group.isDefault[0] === 'true' : group.isDefault || false,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }

  private mapApplicationFromSchema(app: any): Application {
    return {
      appId: app.id,
      type: Array.isArray(app.type) ? app.type[0] : app.type,
      name: Array.isArray(app.name) ? app.name[0] : app.name,
      description: Array.isArray(app.description) ? app.description[0] : app.description,
      config: Array.isArray(app.config) ? JSON.parse(app.config[0] || '{}') : app.config || {},
      remarks: Array.isArray(app.remarks) ? app.remarks[0] : app.remarks,
      groups: app.groups || [],
      isActive: Array.isArray(app.isActive) ? app.isActive[0] === 'true' : app.isActive || false,
      version: Array.isArray(app.version) ? app.version[0] : app.version || '1.0.0',
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    };
  }

  private mapChatSessionFromSchema(session: any): ChatSession {
    return {
      sessionId: session.id,
      userId: Array.isArray(session.userId) ? session.userId[0] : session.userId,
      connectionId: Array.isArray(session.connectionId) ? session.connectionId[0] : session.connectionId,
      title: Array.isArray(session.title) ? session.title[0] : session.title,
      messageCount: Array.isArray(session.messageCount) ? parseInt(session.messageCount[0]) : session.messageCount || 0,
      context: Array.isArray(session.context) ? JSON.parse(session.context[0] || '{}') : session.context || {},
      metadata: Array.isArray(session.metadata) ? JSON.parse(session.metadata[0] || '{}') : session.metadata || {},
      isActive: Array.isArray(session.isActive) ? session.isActive[0] === 'true' : session.isActive || false,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  private mapChatMessageFromSchema(message: any): ChatMessage {
    return {
      messageId: message.id,
      sessionId: Array.isArray(message.sessionId) ? message.sessionId[0] : message.sessionId,
      userId: Array.isArray(message.userId) ? message.userId[0] : message.userId,
      type: Array.isArray(message.type) ? message.type[0] : message.type,
      content: Array.isArray(message.content) ? message.content[0] : message.content,
      metadata: Array.isArray(message.metadata) ? JSON.parse(message.metadata[0] || '{}') : message.metadata || {},
      voiceSessionId: Array.isArray(message.voiceSessionId) ? message.voiceSessionId[0] : message.voiceSessionId,
      mediaUrls: message.mediaUrls || [],
      aiResponse: Array.isArray(message.aiResponse) ? JSON.parse(message.aiResponse[0] || 'null') : message.aiResponse,
      timestamp: Array.isArray(message.timestamp) ? message.timestamp[0] : message.timestamp,
      editedAt: message.editedAt,
    };
  }

  private mapVoiceSessionFromSchema(session: any): VoiceSession {
    return {
      sessionId: session.id,
      novaSonicSessionId: Array.isArray(session.novaSonicSessionId) ? session.novaSonicSessionId[0] : session.novaSonicSessionId,
      connectionId: Array.isArray(session.connectionId) ? session.connectionId[0] : session.connectionId,
      userId: Array.isArray(session.userId) ? session.userId[0] : session.userId,
      chatSessionId: Array.isArray(session.chatSessionId) ? session.chatSessionId[0] : session.chatSessionId,
      status: Array.isArray(session.status) ? session.status[0] : session.status,
      audioFormat: Array.isArray(session.audioFormat) ? session.audioFormat[0] : session.audioFormat,
      duration: Array.isArray(session.duration) ? parseInt(session.duration[0]) : session.duration || 0,
      transcription: session.transcription,
      aiResponse: session.aiResponse,
      createdAt: session.createdAt,
      completedAt: session.completedAt,
    };
  }

  private mapMediaFileFromSchema(file: any): MediaFile {
    return {
      fileId: file.id,
      userId: Array.isArray(file.userId) ? file.userId[0] : file.userId,
      fileName: Array.isArray(file.fileName) ? file.fileName[0] : file.fileName,
      fileType: Array.isArray(file.fileType) ? file.fileType[0] : file.fileType,
      fileSize: Array.isArray(file.fileSize) ? parseInt(file.fileSize[0]) : file.fileSize,
      mimeType: Array.isArray(file.mimeType) ? file.mimeType[0] : file.mimeType,
      s3Key: Array.isArray(file.s3Key) ? file.s3Key[0] : file.s3Key,
      s3Bucket: Array.isArray(file.s3Bucket) ? file.s3Bucket[0] : file.s3Bucket,
      uploadStatus: Array.isArray(file.uploadStatus) ? file.uploadStatus[0] : file.uploadStatus,
      isPublic: Array.isArray(file.isPublic) ? file.isPublic[0] === 'true' : file.isPublic || false,
      tags: file.tags || [],
      metadata: Array.isArray(file.metadata) ? JSON.parse(file.metadata[0] || '{}') : file.metadata || {},
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }

  private mapUserMemoryFromSchema(memory: any): UserMemory {
    return {
      memoryId: memory.id,
      userId: Array.isArray(memory.userId) ? memory.userId[0] : memory.userId,
      type: Array.isArray(memory.type) ? memory.type[0] : memory.type,
      content: Array.isArray(memory.content) ? JSON.parse(memory.content[0] || '{}') : memory.content || {},
      embedding: memory.embedding,
      relevanceScore: Array.isArray(memory.relevanceScore) ? parseFloat(memory.relevanceScore[0]) : memory.relevanceScore,
      expiresAt: Array.isArray(memory.expiresAt) ? memory.expiresAt[0] : memory.expiresAt,
      isActive: Array.isArray(memory.isActive) ? memory.isActive[0] === 'true' : memory.isActive || false,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt,
    };
  }

  private mapNotificationFromSchema(notification: any): Notification {
    return {
      notificationId: notification.id,
      userId: Array.isArray(notification.userId) ? notification.userId[0] : notification.userId,
      type: Array.isArray(notification.type) ? notification.type[0] : notification.type,
      title: Array.isArray(notification.title) ? notification.title[0] : notification.title,
      message: Array.isArray(notification.message) ? notification.message[0] : notification.message,
      data: Array.isArray(notification.data) ? JSON.parse(notification.data[0] || '{}') : notification.data || {},
      isRead: Array.isArray(notification.isRead) ? notification.isRead[0] === 'true' : notification.isRead || false,
      isPersistent: Array.isArray(notification.isPersistent) ? notification.isPersistent[0] === 'true' : notification.isPersistent || false,
      expiresAt: Array.isArray(notification.expiresAt) ? notification.expiresAt[0] : notification.expiresAt,
      createdAt: notification.createdAt,
    };
  }

  private mapConnectionFromSchema(connection: any): Connection {
    return {
      connectionId: connection.id,
      userId: Array.isArray(connection.userId) ? connection.userId[0] : connection.userId,
      sessionId: Array.isArray(connection.sessionId) ? connection.sessionId[0] : connection.sessionId,
      status: Array.isArray(connection.status) ? connection.status[0] : connection.status,
      ipAddress: connection.ipAddress,
      userAgent: connection.userAgent,
      createdAt: connection.createdAt,
      lastActivity: Array.isArray(connection.lastActivity) ? connection.lastActivity[0] : connection.lastActivity,
      disconnectedAt: connection.disconnectedAt,
    };
  }

  // Error handling
  private handleError(error: any): DataError {
    if (error instanceof DataError) {
      return error;
    }

    // Handle Amplify/GraphQL specific errors
    if (error.errors && error.errors.length > 0) {
      const graphqlError = error.errors[0];

      if (graphqlError.errorType === 'Unauthorized') {
        return new DataError(DataErrorType.PERMISSION_DENIED, 'Access denied', 403);
      }

      if (graphqlError.errorType === 'DynamoDB:ConditionalCheckFailedException') {
        return new DataError(DataErrorType.DUPLICATE_KEY, 'Item already exists', 409);
      }
    }

    // Default to internal error
    return new DataError(
      DataErrorType.INTERNAL_ERROR,
      error.message || 'An unexpected error occurred',
      500
    );
  }
}