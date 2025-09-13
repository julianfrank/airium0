import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ApplicationService } from '../services/application-service.js';
import { 
  Application, 
  CreateApplicationRequest, 
  UpdateApplicationRequest,
  DataError
} from '../types/data.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('ApplicationService', () => {
  let applicationService: ApplicationService;
  const mockApiUrl = 'https://api.example.com';

  beforeEach(() => {
    applicationService = new ApplicationService(mockApiUrl);
    vi.clearAllMocks();
  });

  describe('createApplication', () => {
    it('should create a REST application successfully', async () => {
      const request: CreateApplicationRequest = {
        type: 'REST',
        name: 'Test REST API',
        description: 'A test REST application',
        config: {
          url: 'https://api.example.com/test',
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        },
        remarks: 'Test remarks',
        groups: ['group1', 'group2']
      };

      const mockApplication: Application = {
        appId: 'app_123',
        type: 'REST',
        name: 'Test REST API',
        description: 'A test REST application',
        config: request.config,
        remarks: 'Test remarks',
        groups: ['group1', 'group2'],
        isActive: true,
        version: '1.0.0',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ application: mockApplication })
      });

      const result = await applicationService.createApplication(request);

      expect(fetch).toHaveBeenCalledWith(`${mockApiUrl}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      expect(result).toEqual(mockApplication);
    });

    it('should create an MCP application successfully', async () => {
      const request: CreateApplicationRequest = {
        type: 'MCP',
        name: 'Test MCP App',
        config: {
          transport: 'websocket',
          mcpParams: { protocol: 'mcp/1.0' }
        }
      };

      const mockApplication: Application = {
        appId: 'app_456',
        type: 'MCP',
        name: 'Test MCP App',
        config: request.config,
        groups: [],
        isActive: true,
        version: '1.0.0',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ application: mockApplication })
      });

      const result = await applicationService.createApplication(request);
      expect(result).toEqual(mockApplication);
    });

    it('should create an INBUILT application successfully', async () => {
      const request: CreateApplicationRequest = {
        type: 'INBUILT',
        name: 'Test Inbuilt App',
        config: {
          component: 'Dashboard',
          props: { layout: 'grid' }
        }
      };

      const mockApplication: Application = {
        appId: 'app_789',
        type: 'INBUILT',
        name: 'Test Inbuilt App',
        config: request.config,
        groups: [],
        isActive: true,
        version: '1.0.0',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ application: mockApplication })
      });

      const result = await applicationService.createApplication(request);
      expect(result).toEqual(mockApplication);
    });

    it('should throw validation error for invalid REST application', async () => {
      const request: CreateApplicationRequest = {
        type: 'REST',
        name: 'Invalid REST App',
        config: {
          // Missing required URL
        }
      };

      await expect(applicationService.createApplication(request))
        .rejects.toThrow(DataError);
    });

    it('should throw validation error for invalid MCP application', async () => {
      const request: CreateApplicationRequest = {
        type: 'MCP',
        name: 'Invalid MCP App',
        config: {
          // Missing required transport
        }
      };

      await expect(applicationService.createApplication(request))
        .rejects.toThrow(DataError);
    });

    it('should throw validation error for invalid INBUILT application', async () => {
      const request: CreateApplicationRequest = {
        type: 'INBUILT',
        name: 'Invalid Inbuilt App',
        config: {
          // Missing required component
        }
      };

      await expect(applicationService.createApplication(request))
        .rejects.toThrow(DataError);
    });

    it('should handle API errors', async () => {
      const request: CreateApplicationRequest = {
        type: 'REST',
        name: 'Test App',
        config: { url: 'https://api.example.com' }
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Bad request' })
      });

      await expect(applicationService.createApplication(request))
        .rejects.toThrow(DataError);
    });
  });

  describe('getApplication', () => {
    it('should get application successfully', async () => {
      const mockApplication: Application = {
        appId: 'app_123',
        type: 'REST',
        name: 'Test App',
        config: { url: 'https://api.example.com' },
        groups: [],
        isActive: true,
        version: '1.0.0',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ application: mockApplication })
      });

      const result = await applicationService.getApplication('app_123');

      expect(fetch).toHaveBeenCalledWith(`${mockApiUrl}/applications/app_123`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      expect(result).toEqual(mockApplication);
    });

    it('should throw not found error for non-existent application', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Application not found' })
      });

      await expect(applicationService.getApplication('nonexistent'))
        .rejects.toThrow(DataError);
    });
  });

  describe('listApplications', () => {
    it('should list applications successfully', async () => {
      const mockApplications: Application[] = [
        {
          appId: 'app_1',
          type: 'REST',
          name: 'App 1',
          config: { url: 'https://api1.example.com' },
          groups: [],
          isActive: true,
          version: '1.0.0',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z'
        },
        {
          appId: 'app_2',
          type: 'MCP',
          name: 'App 2',
          config: { transport: 'websocket' },
          groups: [],
          isActive: true,
          version: '1.0.0',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z'
        }
      ];

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ applications: mockApplications })
      });

      const result = await applicationService.listApplications();

      expect(fetch).toHaveBeenCalledWith(`${mockApiUrl}/applications`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      expect(result.items).toEqual(mockApplications);
    });

    it('should list applications with query options', async () => {
      const mockApplications: Application[] = [];

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ applications: mockApplications })
      });

      await applicationService.listApplications({ limit: 10, nextToken: 'token123' });

      expect(fetch).toHaveBeenCalledWith(`${mockApiUrl}/applications?limit=10&nextToken=token123`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
    });
  });

  describe('updateApplication', () => {
    it('should update application successfully', async () => {
      const updateRequest: UpdateApplicationRequest = {
        appId: 'app_123',
        name: 'Updated App Name',
        description: 'Updated description'
      };

      const mockUpdatedApp: Application = {
        appId: 'app_123',
        type: 'REST',
        name: 'Updated App Name',
        description: 'Updated description',
        config: { url: 'https://api.example.com' },
        groups: [],
        isActive: true,
        version: '1.0.0',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z'
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ application: mockUpdatedApp })
      });

      const result = await applicationService.updateApplication(updateRequest);

      expect(result).toEqual(mockUpdatedApp);
    });

    it('should throw not found error for non-existent application', async () => {
      const updateRequest: UpdateApplicationRequest = {
        appId: 'nonexistent',
        name: 'Updated Name'
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Application not found' })
      });

      await expect(applicationService.updateApplication(updateRequest))
        .rejects.toThrow(DataError);
    });
  });

  describe('deleteApplication', () => {
    it('should delete application successfully', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Application deleted successfully' })
      });

      await applicationService.deleteApplication('app_123');

      expect(fetch).toHaveBeenCalledWith(`${mockApiUrl}/applications/app_123`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
    });

    it('should throw not found error for non-existent application', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Application not found' })
      });

      await expect(applicationService.deleteApplication('nonexistent'))
        .rejects.toThrow(DataError);
    });
  });

  describe('getApplicationsByGroup', () => {
    it('should get applications by group successfully', async () => {
      const mockApplications: Application[] = [
        {
          appId: 'app_1',
          type: 'REST',
          name: 'App 1',
          config: { url: 'https://api1.example.com' },
          groups: ['group1'],
          isActive: true,
          version: '1.0.0',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z'
        }
      ];

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ applications: mockApplications })
      });

      const result = await applicationService.getApplicationsByGroup('group1');

      expect(fetch).toHaveBeenCalledWith(`${mockApiUrl}/applications?groupId=group1`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      expect(result).toEqual(mockApplications);
    });
  });

  describe('addApplicationToGroup', () => {
    it('should add application to group successfully', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Application added to group successfully' })
      });

      await applicationService.addApplicationToGroup('app_123', 'group1');

      expect(fetch).toHaveBeenCalledWith(`${mockApiUrl}/application-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: 'app_123',
          groupId: 'group1',
          action: 'ADD'
        })
      });
    });
  });

  describe('removeApplicationFromGroup', () => {
    it('should remove application from group successfully', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Application removed from group successfully' })
      });

      await applicationService.removeApplicationFromGroup('app_123', 'group1');

      expect(fetch).toHaveBeenCalledWith(`${mockApiUrl}/application-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: 'app_123',
          groupId: 'group1',
          action: 'REMOVE'
        })
      });
    });
  });

  describe('helper methods', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should create REST application using helper method', async () => {
      const mockApplication: Application = {
        appId: 'app_rest',
        type: 'REST',
        name: 'REST Helper App',
        config: {
          url: 'https://api.example.com',
          method: 'GET',
          headers: { 'Authorization': 'Bearer token' }
        },
        groups: ['group1'],
        isActive: true,
        version: '1.0.0',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ application: mockApplication })
      });

      const result = await applicationService.createRestApplication(
        'REST Helper App',
        'https://api.example.com',
        {
          method: 'GET',
          headers: { 'Authorization': 'Bearer token' },
          groups: ['group1']
        }
      );

      expect(result).toEqual(mockApplication);
    });

    it('should create MCP application using helper method', async () => {
      const mockApplication: Application = {
        appId: 'app_mcp',
        type: 'MCP',
        name: 'MCP Helper App',
        config: {
          transport: 'websocket',
          mcpParams: { protocol: 'mcp/1.0' }
        },
        groups: [],
        isActive: true,
        version: '1.0.0',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ application: mockApplication })
      });

      const result = await applicationService.createMcpApplication(
        'MCP Helper App',
        'websocket',
        { protocol: 'mcp/1.0' }
      );

      expect(result).toEqual(mockApplication);
    });

    it('should create Inbuilt application using helper method', async () => {
      const mockApplication: Application = {
        appId: 'app_inbuilt',
        type: 'INBUILT',
        name: 'Inbuilt Helper App',
        config: {
          component: 'Dashboard',
          props: { layout: 'grid' }
        },
        groups: [],
        isActive: true,
        version: '1.0.0',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ application: mockApplication })
      });

      const result = await applicationService.createInbuiltApplication(
        'Inbuilt Helper App',
        'Dashboard',
        {
          props: { layout: 'grid' }
        }
      );

      expect(result).toEqual(mockApplication);
    });
  });

  describe('validation', () => {
    it('should validate application name is required', async () => {
      const request: CreateApplicationRequest = {
        type: 'REST',
        name: '',
        config: { url: 'https://api.example.com' }
      };

      await expect(applicationService.createApplication(request))
        .rejects.toThrow('Application name is required');
    });

    it('should validate application type is required', async () => {
      const request = {
        name: 'Test App',
        config: { url: 'https://api.example.com' }
      } as CreateApplicationRequest;

      await expect(applicationService.createApplication(request))
        .rejects.toThrow('Valid application type is required');
    });

    it('should validate application config is required', async () => {
      const request = {
        type: 'REST',
        name: 'Test App'
      } as CreateApplicationRequest;

      await expect(applicationService.createApplication(request))
        .rejects.toThrow('Application configuration is required');
    });

    it('should validate REST application URL format', async () => {
      const request: CreateApplicationRequest = {
        type: 'REST',
        name: 'Test App',
        config: { url: 'invalid-url' }
      };

      await expect(applicationService.createApplication(request))
        .rejects.toThrow('Invalid URL format for REST application');
    });
  });
});