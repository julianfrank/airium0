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
        email: request.email,
        profile: request.profile || 'GENERAL',
        groups: request.groups || ['GENERAL'],
        preferences: request.preferences || {},
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
        lastLoginAt: new Date().toISOString(),
      });

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
        name: request.name,
        description: request.description,
        applications: request.applications || [],
        memberCount: 0,
        isDefault: request.isDefault || false,
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
        type: request.type,
        name: request.name,
        description: request.description,
        config: request.config,
        remarks: request.remarks,
        groups: request.groups || [],
        isActive: true,
        version: request.version || '1.0.0',
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
        userId: request.userId,
        connectionId: request.connectionId,
        title: request.title,
        messageCount: 0,
        context: request.context || {},
        metadata: request.metadata || {},
        isActive: true,
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
        sessionId: request.sessionId,
        userId: request.userId,
        type: request.type,
        content: request.content,
        metadata: request.metadata || {},
        voiceSessionId: request.voiceSessionId,
        mediaUrls: request.mediaUrls || [],
        aiResponse: request.aiResponse,
        timestamp: new Date().toISOString(),
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
          messageCount: (session.data.messageCount || 0) + 1,
        });
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
        connectionId: request.connectionId,
        userId: request.userId,
        chatSessionId: request.chatSessionId,
        novaSonicSessionId: request.novaSonicSessionId,
        status: 'ACTIVE',
        audioFormat: request.audioFormat || 'webm',
        duration: 0,
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
        userId: request.userId,
        fileName: request.fileName,
        fileType: request.fileType,
        fileSize: request.fileSize,
        mimeType: request.mimeType,
        s3Key: request.s3Key,
        s3Bucket: request.s3Bucket,
        uploadStatus: 'UPLOADING',
        isPublic: request.isPublic || false,
        tags: request.tags || [],
        metadata: request.metadata || {},
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
        userId: request.userId,
        type: request.type,
        content: request.content,
        embedding: request.embedding,
        relevanceScore: request.relevanceScore,
        expiresAt: request.expiresAt,
        isActive: true,
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
        userId: request.userId,
        type: request.type,
        title: request.title,
        message: request.message,
        data: request.data || {},
        isRead: false,
        isPersistent: request.isPersistent || false,
        expiresAt: request.expiresAt,
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
        userId,
        sessionId,
        status: 'CONNECTED',
        lastActivity: new Date().toISOString(),
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
      email: user.email,
      profile: user.profile,
      groups: user.groups || [],
      preferences: user.preferences || {},
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private mapGroupFromSchema(group: any): Group {
    return {
      groupId: group.id,
      name: group.name,
      description: group.description,
      applications: group.applications || [],
      memberCount: group.memberCount || 0,
      isDefault: group.isDefault || false,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }

  private mapApplicationFromSchema(app: any): Application {
    return {
      appId: app.id,
      type: app.type,
      name: app.name,
      description: app.description,
      config: app.config || {},
      remarks: app.remarks,
      groups: app.groups || [],
      isActive: app.isActive || false,
      version: app.version || '1.0.0',
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    };
  }

  private mapChatSessionFromSchema(session: any): ChatSession {
    return {
      sessionId: session.id,
      userId: session.userId,
      connectionId: session.connectionId,
      title: session.title,
      messageCount: session.messageCount || 0,
      context: session.context || {},
      metadata: session.metadata || {},
      isActive: session.isActive || false,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  private mapChatMessageFromSchema(message: any): ChatMessage {
    return {
      messageId: message.id,
      sessionId: message.sessionId,
      userId: message.userId,
      type: message.type,
      content: message.content,
      metadata: message.metadata || {},
      voiceSessionId: message.voiceSessionId,
      mediaUrls: message.mediaUrls || [],
      aiResponse: message.aiResponse,
      timestamp: message.timestamp,
      editedAt: message.editedAt,
    };
  }

  private mapVoiceSessionFromSchema(session: any): VoiceSession {
    return {
      sessionId: session.id,
      novaSonicSessionId: session.novaSonicSessionId,
      connectionId: session.connectionId,
      userId: session.userId,
      chatSessionId: session.chatSessionId,
      status: session.status,
      audioFormat: session.audioFormat,
      duration: session.duration || 0,
      transcription: session.transcription,
      aiResponse: session.aiResponse,
      createdAt: session.createdAt,
      completedAt: session.completedAt,
    };
  }

  private mapMediaFileFromSchema(file: any): MediaFile {
    return {
      fileId: file.id,
      userId: file.userId,
      fileName: file.fileName,
      fileType: file.fileType,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      s3Key: file.s3Key,
      s3Bucket: file.s3Bucket,
      uploadStatus: file.uploadStatus,
      isPublic: file.isPublic || false,
      tags: file.tags || [],
      metadata: file.metadata || {},
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }

  private mapUserMemoryFromSchema(memory: any): UserMemory {
    return {
      memoryId: memory.id,
      userId: memory.userId,
      type: memory.type,
      content: memory.content || {},
      embedding: memory.embedding,
      relevanceScore: memory.relevanceScore,
      expiresAt: memory.expiresAt,
      isActive: memory.isActive || false,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt,
    };
  }

  private mapNotificationFromSchema(notification: any): Notification {
    return {
      notificationId: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      isRead: notification.isRead || false,
      isPersistent: notification.isPersistent || false,
      expiresAt: notification.expiresAt,
      createdAt: notification.createdAt,
    };
  }

  private mapConnectionFromSchema(connection: any): Connection {
    return {
      connectionId: connection.id,
      userId: connection.userId,
      sessionId: connection.sessionId,
      status: connection.status,
      ipAddress: connection.ipAddress,
      userAgent: connection.userAgent,
      createdAt: connection.createdAt,
      lastActivity: connection.lastActivity,
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