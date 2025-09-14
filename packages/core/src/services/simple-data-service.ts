import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

/**
 * Simplified Data Service for AIrium
 * Provides basic CRUD operations for DynamoDB models
 * Requirements: 7.1, 7.2, 7.4, 10.3
 */
export class SimpleDataService {
  private client = generateClient<Schema>();

  // User operations
  async createUser(email: string, profile: 'ADMIN' | 'GENERAL' = 'GENERAL') {
    try {
      const result = await this.client.models.User.create({
        email: [email],
        profile: [profile],
        groups: [profile],
        preferences: [JSON.stringify({})],
      });
      return result.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUser(id: string) {
    try {
      const result = await this.client.models.User.get({ id });
      return result.data;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  async listUsers() {
    try {
      const result = await this.client.models.User.list();
      return result.data;
    } catch (error) {
      console.error('Error listing users:', error);
      throw error;
    }
  }

  // Group operations
  async createGroup(name: string, description?: string) {
    try {
      const result = await this.client.models.Group.create({
        name: [name],
        description: description ? [description] : undefined,
        applications: [],
        memberCount: ['0'],
        isDefault: ['false'],
      });
      return result.data;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  async listGroups() {
    try {
      const result = await this.client.models.Group.list();
      return result.data;
    } catch (error) {
      console.error('Error listing groups:', error);
      throw error;
    }
  }

  // Application operations
  async createApplication(
    type: 'REST' | 'MCP' | 'INBUILT',
    name: string,
    config: Record<string, any>
  ) {
    try {
      const result = await this.client.models.Application.create({
        type: [type],
        name: [name],
        config: [JSON.stringify(config)],
        groups: [],
        isActive: ['true'],
        version: ['1.0.0'],
      });
      return result.data;
    } catch (error) {
      console.error('Error creating application:', error);
      throw error;
    }
  }

  async listApplications() {
    try {
      const result = await this.client.models.Application.list();
      return result.data;
    } catch (error) {
      console.error('Error listing applications:', error);
      throw error;
    }
  }

  // Chat operations
  async createChatSession(userId: string, title?: string) {
    try {
      const result = await this.client.models.ChatSession.create({
        userId: [userId],
        title: title ? [title] : undefined,
        messageCount: ['0'],
        context: [JSON.stringify({})],
        metadata: [JSON.stringify({})],
        isActive: ['true'],
      });
      return result.data;
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw error;
    }
  }

  async createChatMessage(
    sessionId: string,
    userId: string,
    type: 'TEXT' | 'VOICE' | 'MEDIA' | 'SYSTEM',
    content: string
  ) {
    try {
      const result = await this.client.models.ChatMessage.create({
        sessionId: [sessionId],
        userId: [userId],
        type: [type],
        content: [content],
        metadata: [JSON.stringify({})],
        mediaUrls: [],
        timestamp: [new Date().toISOString()],
      });
      return result.data;
    } catch (error) {
      console.error('Error creating chat message:', error);
      throw error;
    }
  }

  // Voice session operations
  async createVoiceSession(connectionId: string, userId: string) {
    try {
      const result = await this.client.models.VoiceSession.create({
        connectionId: [connectionId],
        userId: [userId],
        status: ['ACTIVE'],
        audioFormat: ['webm'],
        duration: ['0'],
      });
      return result.data;
    } catch (error) {
      console.error('Error creating voice session:', error);
      throw error;
    }
  }

  // Media file operations
  async createMediaFile(
    userId: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    mimeType: string,
    s3Key: string,
    s3Bucket: string
  ) {
    try {
      const result = await this.client.models.MediaFile.create({
        userId: [userId],
        fileName: [fileName],
        fileType: [fileType],
        fileSize: [String(fileSize)],
        mimeType: [mimeType],
        s3Key: [s3Key],
        s3Bucket: [s3Bucket],
        uploadStatus: ['UPLOADING'],
        isPublic: ['false'],
        tags: [],
        metadata: [JSON.stringify({})],
      });
      return result.data;
    } catch (error) {
      console.error('Error creating media file:', error);
      throw error;
    }
  }

  // User memory operations
  async createUserMemory(
    userId: string,
    type: 'CONVERSATION' | 'PREFERENCE' | 'CONTEXT' | 'KNOWLEDGE',
    content: Record<string, any>
  ) {
    try {
      const result = await this.client.models.UserMemory.create({
        userId: [userId],
        type: [type],
        content: [JSON.stringify(content)],
        isActive: ['true'],
      });
      return result.data;
    } catch (error) {
      console.error('Error creating user memory:', error);
      throw error;
    }
  }

  // Notification operations
  async createNotification(
    userId: string,
    type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS',
    title: string,
    message: string
  ) {
    try {
      const result = await this.client.models.Notification.create({
        userId: [userId],
        type: [type],
        title: [title],
        message: [message],
        data: [JSON.stringify({})],
        isRead: ['false'],
        isPersistent: ['false'],
      });
      return result.data;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
}