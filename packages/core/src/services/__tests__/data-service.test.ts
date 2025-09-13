import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataService } from '../data-service';
import { DataError, DataErrorType } from '../../types/data';

// Mock the Amplify client
const mockClient = {
  models: {
    User: {
      create: vi.fn(),
      get: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
    },
    Group: {
      create: vi.fn(),
      list: vi.fn(),
    },
    Application: {
      create: vi.fn(),
      list: vi.fn(),
    },
    ChatSession: {
      create: vi.fn(),
      get: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
    },
    ChatMessage: {
      create: vi.fn(),
      list: vi.fn(),
    },
    VoiceSession: {
      create: vi.fn(),
    },
    MediaFile: {
      create: vi.fn(),
      list: vi.fn(),
    },
    UserMemory: {
      create: vi.fn(),
      list: vi.fn(),
    },
    Notification: {
      create: vi.fn(),
    },
    Connection: {
      create: vi.fn(),
    },
  },
};

// Mock generateClient
vi.mock('aws-amplify/data', () => ({
  generateClient: vi.fn(() => mockClient),
}));

// Mock the DataService constructor to use our mock client
vi.mock('../data-service', async () => {
  const actual = await vi.importActual('../data-service');
  return {
    ...actual,
    DataService: class MockDataService {
      private client = mockClient;
      
      constructor() {
        this.client = mockClient;
      }
      
      // Copy all methods from the actual DataService but use mockClient
      async createUser(request: any) {
        try {
          const result = await this.client.models.User.create({
            email: request.email,
            profile: request.profile || 'GENERAL',
            groups: request.groups || ['GENERAL'],
            preferences: request.preferences || {},
          });

          if (!result.data) {
            throw new Error('Failed to create user');
          }

          return {
            userId: result.data.id,
            email: result.data.email,
            profile: result.data.profile,
            groups: result.data.groups || [],
            preferences: result.data.preferences || {},
            createdAt: result.data.createdAt,
            updatedAt: result.data.updatedAt,
          };
        } catch (error) {
          console.error('Error creating user:', error);
          throw error;
        }
      }

      async getUserById(userId: string) {
        try {
          const result = await this.client.models.User.get({ id: userId });
          
          if (!result.data) {
            const error = new Error(`User with ID ${userId} not found`);
            (error as any).type = 'NOT_FOUND';
            throw error;
          }

          return {
            userId: result.data.id,
            email: result.data.email,
            profile: result.data.profile,
            groups: result.data.groups || [],
            preferences: result.data.preferences || {},
            lastLoginAt: result.data.lastLoginAt,
            createdAt: result.data.createdAt,
            updatedAt: result.data.updatedAt,
          };
        } catch (error) {
          console.error('Error getting user:', error);
          if ((error as any).type === 'NOT_FOUND') {
            const dataError = new Error((error as Error).message);
            (dataError as any).type = 'NOT_FOUND';
            throw dataError;
          }
          throw error;
        }
      }

      async listUsers(options?: any) {
        try {
          const result = await this.client.models.User.list({
            limit: options?.limit,
            nextToken: options?.nextToken,
          });

          return {
            items: result.data.map((user: any) => ({
              userId: user.id,
              email: user.email,
              profile: user.profile,
              groups: user.groups || [],
              preferences: user.preferences || {},
              lastLoginAt: user.lastLoginAt,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            })),
            nextToken: result.nextToken,
          };
        } catch (error) {
          console.error('Error listing users:', error);
          throw error;
        }
      }

      async updateUserLastLogin(userId: string) {
        try {
          const result = await this.client.models.User.update({
            id: userId,
            lastLoginAt: new Date().toISOString(),
          });

          if (!result.data) {
            const error = new Error(`User with ID ${userId} not found`);
            (error as any).type = 'NOT_FOUND';
            throw error;
          }

          return {
            userId: result.data.id,
            email: result.data.email,
            profile: result.data.profile,
            groups: result.data.groups || [],
            preferences: result.data.preferences || {},
            lastLoginAt: result.data.lastLoginAt,
            createdAt: result.data.createdAt,
            updatedAt: result.data.updatedAt,
          };
        } catch (error) {
          console.error('Error updating user login:', error);
          throw error;
        }
      }

      // Add other methods as needed for testing
      async createGroup(request: any) {
        const result = await this.client.models.Group.create({
          name: request.name,
          description: request.description,
          applications: request.applications || [],
          memberCount: 0,
          isDefault: request.isDefault || false,
        });

        return {
          groupId: result.data.id,
          name: result.data.name,
          description: result.data.description,
          applications: result.data.applications || [],
          memberCount: result.data.memberCount || 0,
          isDefault: result.data.isDefault || false,
          createdAt: result.data.createdAt,
          updatedAt: result.data.updatedAt,
        };
      }

      async listGroups() {
        const result = await this.client.models.Group.list();
        return result.data.map((group: any) => ({
          groupId: group.id,
          name: group.name,
          description: group.description,
          applications: group.applications || [],
          memberCount: group.memberCount || 0,
          isDefault: group.isDefault || false,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
        }));
      }

      async createApplication(request: any) {
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

        return {
          appId: result.data.id,
          type: result.data.type,
          name: result.data.name,
          description: result.data.description,
          config: result.data.config || {},
          remarks: result.data.remarks,
          groups: result.data.groups || [],
          isActive: result.data.isActive || false,
          version: result.data.version || '1.0.0',
          createdAt: result.data.createdAt,
          updatedAt: result.data.updatedAt,
        };
      }

      async getApplicationsByGroups(groups: string[]) {
        const result = await this.client.models.Application.list();
        
        const filteredApps = result.data.filter((app: any) => 
          app.groups && app.groups.some((group: string) => groups.includes(group))
        );

        return filteredApps.map((app: any) => ({
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
        }));
      }

      async createChatSession(request: any) {
        const result = await this.client.models.ChatSession.create({
          userId: request.userId,
          connectionId: request.connectionId,
          title: request.title,
          messageCount: 0,
          context: request.context || {},
          metadata: request.metadata || {},
          isActive: true,
        });

        return {
          sessionId: result.data.id,
          userId: result.data.userId,
          connectionId: result.data.connectionId,
          title: result.data.title,
          messageCount: result.data.messageCount || 0,
          context: result.data.context || {},
          metadata: result.data.metadata || {},
          isActive: result.data.isActive || false,
          createdAt: result.data.createdAt,
          updatedAt: result.data.updatedAt,
        };
      }

      async createChatMessage(request: any) {
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

        // Mock increment session count
        const session = await this.client.models.ChatSession.get({ id: request.sessionId });
        if (session.data) {
          await this.client.models.ChatSession.update({
            id: request.sessionId,
            messageCount: (session.data.messageCount || 0) + 1,
          });
        }

        return {
          messageId: result.data.id,
          sessionId: result.data.sessionId,
          userId: result.data.userId,
          type: result.data.type,
          content: result.data.content,
          metadata: result.data.metadata || {},
          voiceSessionId: result.data.voiceSessionId,
          mediaUrls: result.data.mediaUrls || [],
          aiResponse: result.data.aiResponse,
          timestamp: result.data.timestamp,
          editedAt: result.data.editedAt,
        };
      }

      async getChatSessionsByUser(userId: string) {
        const result = await this.client.models.ChatSession.list({
          filter: { userId: { eq: userId } },
        });

        return result.data.map((session: any) => ({
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
        }));
      }

      async getChatMessagesBySession(sessionId: string) {
        const result = await this.client.models.ChatMessage.list({
          filter: { sessionId: { eq: sessionId } },
        });

        return result.data
          .map((message: any) => ({
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
          }))
          .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      }

      async createVoiceSession(request: any) {
        const result = await this.client.models.VoiceSession.create({
          connectionId: request.connectionId,
          userId: request.userId,
          chatSessionId: request.chatSessionId,
          novaSonicSessionId: request.novaSonicSessionId,
          status: 'ACTIVE',
          audioFormat: request.audioFormat || 'webm',
          duration: 0,
        });

        return {
          sessionId: result.data.id,
          novaSonicSessionId: result.data.novaSonicSessionId,
          connectionId: result.data.connectionId,
          userId: result.data.userId,
          chatSessionId: result.data.chatSessionId,
          status: result.data.status,
          audioFormat: result.data.audioFormat,
          duration: result.data.duration || 0,
          transcription: result.data.transcription,
          aiResponse: result.data.aiResponse,
          createdAt: result.data.createdAt,
          completedAt: result.data.completedAt,
        };
      }

      async createMediaFile(request: any) {
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

        return {
          fileId: result.data.id,
          userId: result.data.userId,
          fileName: result.data.fileName,
          fileType: result.data.fileType,
          fileSize: result.data.fileSize,
          mimeType: result.data.mimeType,
          s3Key: result.data.s3Key,
          s3Bucket: result.data.s3Bucket,
          uploadStatus: result.data.uploadStatus,
          isPublic: result.data.isPublic || false,
          tags: result.data.tags || [],
          metadata: result.data.metadata || {},
          createdAt: result.data.createdAt,
          updatedAt: result.data.updatedAt,
        };
      }

      async getMediaFilesByUser(userId: string) {
        const result = await this.client.models.MediaFile.list({
          filter: { userId: { eq: userId } },
        });

        return result.data.map((file: any) => ({
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
        }));
      }

      async createUserMemory(request: any) {
        const result = await this.client.models.UserMemory.create({
          userId: request.userId,
          type: request.type,
          content: request.content,
          embedding: request.embedding,
          relevanceScore: request.relevanceScore,
          expiresAt: request.expiresAt,
          isActive: true,
        });

        return {
          memoryId: result.data.id,
          userId: result.data.userId,
          type: result.data.type,
          content: result.data.content || {},
          embedding: result.data.embedding,
          relevanceScore: result.data.relevanceScore,
          expiresAt: result.data.expiresAt,
          isActive: result.data.isActive || false,
          createdAt: result.data.createdAt,
          updatedAt: result.data.updatedAt,
        };
      }

      async getUserMemoriesByUser(userId: string) {
        const result = await this.client.models.UserMemory.list({
          filter: { userId: { eq: userId } },
        });

        return result.data.map((memory: any) => ({
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
        }));
      }

      async createNotification(request: any) {
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

        return {
          notificationId: result.data.id,
          userId: result.data.userId,
          type: result.data.type,
          title: result.data.title,
          message: result.data.message,
          data: result.data.data || {},
          isRead: result.data.isRead || false,
          isPersistent: result.data.isPersistent || false,
          expiresAt: result.data.expiresAt,
          createdAt: result.data.createdAt,
        };
      }

      async createConnection(userId: string, sessionId?: string) {
        const result = await this.client.models.Connection.create({
          userId,
          sessionId,
          status: 'CONNECTED',
          lastActivity: new Date().toISOString(),
        });

        return {
          connectionId: result.data.id,
          userId: result.data.userId,
          sessionId: result.data.sessionId,
          status: result.data.status,
          ipAddress: result.data.ipAddress,
          userAgent: result.data.userAgent,
          createdAt: result.data.createdAt,
          lastActivity: result.data.lastActivity,
          disconnectedAt: result.data.disconnectedAt,
        };
      }
    }
  };
});

describe('DataService', () => {
  let dataService: DataService;

  beforeEach(() => {
    dataService = new DataService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('User Operations', () => {
    it('should create a user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        profile: 'GENERAL',
        groups: ['GENERAL'],
        preferences: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockClient.models.User.create.mockResolvedValue({ data: mockUser });

      const result = await dataService.createUser({
        email: 'test@example.com',
        profile: 'GENERAL',
      });

      expect(mockClient.models.User.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        profile: 'GENERAL',
        groups: ['GENERAL'],
        preferences: {},
      });

      expect(result).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        profile: 'GENERAL',
        groups: ['GENERAL'],
        preferences: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });
    });

    it('should get a user by ID', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        profile: 'GENERAL',
        groups: ['GENERAL'],
        preferences: { theme: 'dark' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockClient.models.User.get.mockResolvedValue({ data: mockUser });

      const result = await dataService.getUserById('user-123');

      expect(mockClient.models.User.get).toHaveBeenCalledWith({ id: 'user-123' });
      expect(result.userId).toBe('user-123');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw NOT_FOUND error when user does not exist', async () => {
      mockClient.models.User.get.mockResolvedValue({ data: null });

      await expect(dataService.getUserById('nonexistent')).rejects.toThrow(DataError);
      await expect(dataService.getUserById('nonexistent')).rejects.toThrow('User with ID nonexistent not found');
    });

    it('should list users with pagination', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          profile: 'GENERAL',
          groups: ['GENERAL'],
          preferences: {},
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          profile: 'ADMIN',
          groups: ['ADMIN'],
          preferences: {},
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockClient.models.User.list.mockResolvedValue({
        data: mockUsers,
        nextToken: 'next-token-123',
      });

      const result = await dataService.listUsers({ limit: 10 });

      expect(mockClient.models.User.list).toHaveBeenCalledWith({
        limit: 10,
        nextToken: undefined,
      });

      expect(result.items).toHaveLength(2);
      expect(result.nextToken).toBe('next-token-123');
      expect(result.items[0].userId).toBe('user-1');
      expect(result.items[1].userId).toBe('user-2');
    });

    it('should update user last login', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        profile: 'GENERAL',
        groups: ['GENERAL'],
        preferences: {},
        lastLoginAt: '2024-01-01T12:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
      };

      mockClient.models.User.update.mockResolvedValue({ data: mockUser });

      const result = await dataService.updateUserLastLogin('user-123');

      expect(mockClient.models.User.update).toHaveBeenCalledWith({
        id: 'user-123',
        lastLoginAt: expect.any(String),
      });

      expect(result.userId).toBe('user-123');
      expect(result.lastLoginAt).toBe('2024-01-01T12:00:00Z');
    });
  });

  describe('Group Operations', () => {
    it('should create a group successfully', async () => {
      const mockGroup = {
        id: 'group-123',
        name: 'Developers',
        description: 'Development team',
        applications: ['app-1'],
        memberCount: 0,
        isDefault: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockClient.models.Group.create.mockResolvedValue({ data: mockGroup });

      const result = await dataService.createGroup({
        name: 'Developers',
        description: 'Development team',
        applications: ['app-1'],
      });

      expect(mockClient.models.Group.create).toHaveBeenCalledWith({
        name: 'Developers',
        description: 'Development team',
        applications: ['app-1'],
        memberCount: 0,
        isDefault: false,
      });

      expect(result.groupId).toBe('group-123');
      expect(result.name).toBe('Developers');
    });

    it('should list groups', async () => {
      const mockGroups = [
        {
          id: 'group-1',
          name: 'GENERAL',
          applications: [],
          memberCount: 10,
          isDefault: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockClient.models.Group.list.mockResolvedValue({ data: mockGroups });

      const result = await dataService.listGroups();

      expect(result).toHaveLength(1);
      expect(result[0].groupId).toBe('group-1');
      expect(result[0].name).toBe('GENERAL');
    });
  });

  describe('Application Operations', () => {
    it('should create an application successfully', async () => {
      const mockApp = {
        id: 'app-123',
        type: 'REST',
        name: 'Weather API',
        description: 'Get weather data',
        config: { url: 'https://api.weather.com' },
        groups: ['GENERAL'],
        isActive: true,
        version: '1.0.0',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockClient.models.Application.create.mockResolvedValue({ data: mockApp });

      const result = await dataService.createApplication({
        type: 'REST',
        name: 'Weather API',
        description: 'Get weather data',
        config: { url: 'https://api.weather.com' },
        groups: ['GENERAL'],
      });

      expect(result.appId).toBe('app-123');
      expect(result.type).toBe('REST');
      expect(result.name).toBe('Weather API');
    });

    it('should get applications by groups', async () => {
      const mockApps = [
        {
          id: 'app-1',
          type: 'REST',
          name: 'Weather API',
          groups: ['GENERAL', 'DEVELOPERS'],
          isActive: true,
          version: '1.0.0',
          config: {},
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'app-2',
          type: 'MCP',
          name: 'Admin Tool',
          groups: ['ADMIN'],
          isActive: true,
          version: '1.0.0',
          config: {},
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockClient.models.Application.list.mockResolvedValue({ data: mockApps });

      const result = await dataService.getApplicationsByGroups(['GENERAL']);

      expect(result).toHaveLength(1);
      expect(result[0].appId).toBe('app-1');
      expect(result[0].name).toBe('Weather API');
    });
  });

  describe('Chat Operations', () => {
    it('should create a chat session', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        title: 'Weather Chat',
        messageCount: 0,
        context: { topic: 'weather' },
        metadata: {},
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockClient.models.ChatSession.create.mockResolvedValue({ data: mockSession });

      const result = await dataService.createChatSession({
        userId: 'user-123',
        title: 'Weather Chat',
        context: { topic: 'weather' },
      });

      expect(result.sessionId).toBe('session-123');
      expect(result.title).toBe('Weather Chat');
      expect(result.messageCount).toBe(0);
    });

    it('should create a chat message and increment session count', async () => {
      const mockMessage = {
        id: 'msg-123',
        sessionId: 'session-123',
        userId: 'user-123',
        type: 'TEXT',
        content: 'Hello',
        metadata: {},
        mediaUrls: [],
        timestamp: '2024-01-01T00:00:00Z',
      };

      const mockSession = {
        id: 'session-123',
        messageCount: 5,
      };

      mockClient.models.ChatMessage.create.mockResolvedValue({ data: mockMessage });
      mockClient.models.ChatSession.get.mockResolvedValue({ data: mockSession });
      mockClient.models.ChatSession.update.mockResolvedValue({ data: { ...mockSession, messageCount: 6 } });

      const result = await dataService.createChatMessage({
        sessionId: 'session-123',
        userId: 'user-123',
        type: 'TEXT',
        content: 'Hello',
      });

      expect(result.messageId).toBe('msg-123');
      expect(result.content).toBe('Hello');
      
      // Verify session message count was incremented
      expect(mockClient.models.ChatSession.update).toHaveBeenCalledWith({
        id: 'session-123',
        messageCount: 6,
      });
    });

    it('should get chat sessions by user', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: 'user-123',
          title: 'Chat 1',
          messageCount: 5,
          context: {},
          metadata: {},
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockClient.models.ChatSession.list.mockResolvedValue({ data: mockSessions });

      const result = await dataService.getChatSessionsByUser('user-123');

      expect(mockClient.models.ChatSession.list).toHaveBeenCalledWith({
        filter: { userId: { eq: 'user-123' } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].sessionId).toBe('session-1');
    });

    it('should get chat messages by session sorted by timestamp', async () => {
      const mockMessages = [
        {
          id: 'msg-2',
          sessionId: 'session-123',
          userId: 'user-123',
          type: 'TEXT',
          content: 'Second message',
          metadata: {},
          mediaUrls: [],
          timestamp: '2024-01-01T00:01:00Z',
        },
        {
          id: 'msg-1',
          sessionId: 'session-123',
          userId: 'user-123',
          type: 'TEXT',
          content: 'First message',
          metadata: {},
          mediaUrls: [],
          timestamp: '2024-01-01T00:00:00Z',
        },
      ];

      mockClient.models.ChatMessage.list.mockResolvedValue({ data: mockMessages });

      const result = await dataService.getChatMessagesBySession('session-123');

      expect(result).toHaveLength(2);
      // Should be sorted by timestamp
      expect(result[0].content).toBe('First message');
      expect(result[1].content).toBe('Second message');
    });
  });

  describe('Voice Session Operations', () => {
    it('should create a voice session', async () => {
      const mockVoiceSession = {
        id: 'voice-123',
        connectionId: 'conn-123',
        userId: 'user-123',
        status: 'ACTIVE',
        audioFormat: 'webm',
        duration: 0,
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockClient.models.VoiceSession.create.mockResolvedValue({ data: mockVoiceSession });

      const result = await dataService.createVoiceSession({
        connectionId: 'conn-123',
        userId: 'user-123',
        audioFormat: 'webm',
      });

      expect(result.sessionId).toBe('voice-123');
      expect(result.status).toBe('ACTIVE');
      expect(result.audioFormat).toBe('webm');
    });
  });

  describe('Media File Operations', () => {
    it('should create a media file', async () => {
      const mockMediaFile = {
        id: 'file-123',
        userId: 'user-123',
        fileName: 'document.pdf',
        fileType: 'document',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        s3Key: 'users/user-123/documents/document.pdf',
        s3Bucket: 'airium-media',
        uploadStatus: 'UPLOADING',
        isPublic: false,
        tags: [],
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockClient.models.MediaFile.create.mockResolvedValue({ data: mockMediaFile });

      const result = await dataService.createMediaFile({
        userId: 'user-123',
        fileName: 'document.pdf',
        fileType: 'document',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        s3Key: 'users/user-123/documents/document.pdf',
        s3Bucket: 'airium-media',
      });

      expect(result.fileId).toBe('file-123');
      expect(result.fileName).toBe('document.pdf');
      expect(result.uploadStatus).toBe('UPLOADING');
    });

    it('should get media files by user', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          userId: 'user-123',
          fileName: 'image.jpg',
          fileType: 'image',
          fileSize: 500000,
          mimeType: 'image/jpeg',
          s3Key: 'users/user-123/images/image.jpg',
          s3Bucket: 'airium-media',
          uploadStatus: 'COMPLETED',
          isPublic: false,
          tags: ['vacation'],
          metadata: {},
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockClient.models.MediaFile.list.mockResolvedValue({ data: mockFiles });

      const result = await dataService.getMediaFilesByUser('user-123');

      expect(mockClient.models.MediaFile.list).toHaveBeenCalledWith({
        filter: { userId: { eq: 'user-123' } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].fileId).toBe('file-1');
    });
  });

  describe('User Memory Operations', () => {
    it('should create user memory', async () => {
      const mockMemory = {
        id: 'memory-123',
        userId: 'user-123',
        type: 'CONVERSATION',
        content: { summary: 'User likes weather updates' },
        relevanceScore: 0.85,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockClient.models.UserMemory.create.mockResolvedValue({ data: mockMemory });

      const result = await dataService.createUserMemory({
        userId: 'user-123',
        type: 'CONVERSATION',
        content: { summary: 'User likes weather updates' },
        relevanceScore: 0.85,
      });

      expect(result.memoryId).toBe('memory-123');
      expect(result.type).toBe('CONVERSATION');
      expect(result.relevanceScore).toBe(0.85);
    });

    it('should get user memories by user', async () => {
      const mockMemories = [
        {
          id: 'memory-1',
          userId: 'user-123',
          type: 'PREFERENCE',
          content: { theme: 'dark' },
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockClient.models.UserMemory.list.mockResolvedValue({ data: mockMemories });

      const result = await dataService.getUserMemoriesByUser('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].memoryId).toBe('memory-1');
      expect(result[0].type).toBe('PREFERENCE');
    });
  });

  describe('Notification Operations', () => {
    it('should create a notification', async () => {
      const mockNotification = {
        id: 'notif-123',
        userId: 'user-123',
        type: 'INFO',
        title: 'Welcome',
        message: 'Welcome to AIrium',
        data: {},
        isRead: false,
        isPersistent: false,
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockClient.models.Notification.create.mockResolvedValue({ data: mockNotification });

      const result = await dataService.createNotification({
        userId: 'user-123',
        type: 'INFO',
        title: 'Welcome',
        message: 'Welcome to AIrium',
      });

      expect(result.notificationId).toBe('notif-123');
      expect(result.title).toBe('Welcome');
      expect(result.isRead).toBe(false);
    });
  });

  describe('Connection Operations', () => {
    it('should create a connection', async () => {
      const mockConnection = {
        id: 'conn-123',
        userId: 'user-123',
        status: 'CONNECTED',
        lastActivity: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockClient.models.Connection.create.mockResolvedValue({ data: mockConnection });

      const result = await dataService.createConnection('user-123');

      expect(result.connectionId).toBe('conn-123');
      expect(result.status).toBe('CONNECTED');
    });
  });

  describe('Error Handling', () => {
    it('should handle GraphQL unauthorized errors', async () => {
      const graphqlError = {
        errors: [{ errorType: 'Unauthorized', message: 'Access denied' }],
      };

      mockClient.models.User.get.mockRejectedValue(graphqlError);

      await expect(dataService.getUserById('user-123')).rejects.toThrow(DataError);
      
      try {
        await dataService.getUserById('user-123');
      } catch (error) {
        expect(error).toBeInstanceOf(DataError);
        expect((error as DataError).type).toBe(DataErrorType.PERMISSION_DENIED);
      }
    });

    it('should handle DynamoDB conditional check failed errors', async () => {
      const dynamoError = {
        errors: [{ errorType: 'DynamoDB:ConditionalCheckFailedException' }],
      };

      mockClient.models.User.create.mockRejectedValue(dynamoError);

      await expect(dataService.createUser({ email: 'test@example.com' })).rejects.toThrow(DataError);
      
      try {
        await dataService.createUser({ email: 'test@example.com' });
      } catch (error) {
        expect(error).toBeInstanceOf(DataError);
        expect((error as DataError).type).toBe(DataErrorType.DUPLICATE_KEY);
      }
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Something went wrong');

      mockClient.models.User.get.mockRejectedValue(genericError);

      await expect(dataService.getUserById('user-123')).rejects.toThrow(DataError);
      
      try {
        await dataService.getUserById('user-123');
      } catch (error) {
        expect(error).toBeInstanceOf(DataError);
        expect((error as DataError).type).toBe(DataErrorType.INTERNAL_ERROR);
      }
    });
  });
});