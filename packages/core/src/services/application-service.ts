import { 
  Application, 
  CreateApplicationRequest, 
  UpdateApplicationRequest,
  ApplicationType,
  ApplicationConfig,
  DataQueryOptions,
  DataQueryResult,
  DataError,
  DataErrorType
} from '../types/data.js';

/**
 * Application Service for managing REST, MCP, and Inbuilt applications
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export class ApplicationService {
  private apiBaseUrl: string;

  constructor(apiBaseUrl?: string) {
    this.apiBaseUrl = apiBaseUrl || process.env.APPLICATION_API_URL || '';
  }

  /**
   * Create a new application
   * Requirements: 4.1, 4.2, 4.3
   */
  async createApplication(request: CreateApplicationRequest): Promise<Application> {
    try {
      this.validateApplicationRequest(request);

      const response = await fetch(`${this.apiBaseUrl}/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json() as { message?: string };
        throw new DataError(
          DataErrorType.VALIDATION_ERROR,
          error.message || 'Failed to create application',
          response.status
        );
      }

      const result = await response.json() as { application: Application };
      return result.application;
    } catch (error) {
      if (error instanceof DataError) {
        throw error;
      }
      throw new DataError(
        DataErrorType.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  /**
   * Get application by ID
   */
  async getApplication(appId: string): Promise<Application> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/applications/${appId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new DataError(
            DataErrorType.NOT_FOUND,
            'Application not found',
            404
          );
        }
        const error = await response.json() as { message?: string };
        throw new DataError(
          DataErrorType.INTERNAL_ERROR,
          error.message || 'Failed to get application',
          response.status
        );
      }

      const result = await response.json() as { application: Application };
      return result.application;
    } catch (error) {
      if (error instanceof DataError) {
        throw error;
      }
      throw new DataError(
        DataErrorType.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  /**
   * List all applications
   */
  async listApplications(options?: DataQueryOptions): Promise<DataQueryResult<Application>> {
    try {
      const queryParams = new URLSearchParams();
      if (options?.limit) {
        queryParams.append('limit', options.limit.toString());
      }
      if (options?.nextToken) {
        queryParams.append('nextToken', options.nextToken);
      }

      const url = `${this.apiBaseUrl}/applications${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json() as { message?: string };
        throw new DataError(
          DataErrorType.INTERNAL_ERROR,
          error.message || 'Failed to list applications',
          response.status
        );
      }

      const result = await response.json() as { 
        applications: Application[];
        nextToken?: string;
        scannedCount?: number;
      };
      return {
        items: result.applications,
        nextToken: result.nextToken,
        scannedCount: result.scannedCount,
      };
    } catch (error) {
      if (error instanceof DataError) {
        throw error;
      }
      throw new DataError(
        DataErrorType.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  /**
   * Get applications by group
   * Requirements: 4.4
   */
  async getApplicationsByGroup(groupId: string): Promise<Application[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/applications?groupId=${encodeURIComponent(groupId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json() as { message?: string };
        throw new DataError(
          DataErrorType.INTERNAL_ERROR,
          error.message || 'Failed to get applications by group',
          response.status
        );
      }

      const result = await response.json() as { applications: Application[] };
      return result.applications;
    } catch (error) {
      if (error instanceof DataError) {
        throw error;
      }
      throw new DataError(
        DataErrorType.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  /**
   * Update application
   * Requirements: 4.1, 4.2, 4.3
   */
  async updateApplication(request: UpdateApplicationRequest): Promise<Application> {
    try {
      if (request.config) {
        // We need to get the current application to validate the config type
        const currentApp = await this.getApplication(request.appId);
        this.validateApplicationConfig(currentApp.type, request.config);
      }

      const response = await fetch(`${this.apiBaseUrl}/applications/${request.appId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new DataError(
            DataErrorType.NOT_FOUND,
            'Application not found',
            404
          );
        }
        const error = await response.json() as { message?: string };
        throw new DataError(
          DataErrorType.VALIDATION_ERROR,
          error.message || 'Failed to update application',
          response.status
        );
      }

      const result = await response.json() as { application: Application };
      return result.application;
    } catch (error) {
      if (error instanceof DataError) {
        throw error;
      }
      throw new DataError(
        DataErrorType.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  /**
   * Delete application (soft delete)
   */
  async deleteApplication(appId: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/applications/${appId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new DataError(
            DataErrorType.NOT_FOUND,
            'Application not found',
            404
          );
        }
        const error = await response.json() as { message?: string };
        throw new DataError(
          DataErrorType.INTERNAL_ERROR,
          error.message || 'Failed to delete application',
          response.status
        );
      }
    } catch (error) {
      if (error instanceof DataError) {
        throw error;
      }
      throw new DataError(
        DataErrorType.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  /**
   * Add application to group
   * Requirements: 4.4
   */
  async addApplicationToGroup(applicationId: string, groupId: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/application-groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId,
          groupId,
          action: 'ADD',
        }),
      });

      if (!response.ok) {
        const error = await response.json() as { message?: string };
        throw new DataError(
          DataErrorType.VALIDATION_ERROR,
          error.message || 'Failed to add application to group',
          response.status
        );
      }
    } catch (error) {
      if (error instanceof DataError) {
        throw error;
      }
      throw new DataError(
        DataErrorType.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  /**
   * Remove application from group
   * Requirements: 4.4
   */
  async removeApplicationFromGroup(applicationId: string, groupId: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/application-groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId,
          groupId,
          action: 'REMOVE',
        }),
      });

      if (!response.ok) {
        const error = await response.json() as { message?: string };
        throw new DataError(
          DataErrorType.VALIDATION_ERROR,
          error.message || 'Failed to remove application from group',
          response.status
        );
      }
    } catch (error) {
      if (error instanceof DataError) {
        throw error;
      }
      throw new DataError(
        DataErrorType.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  /**
   * Get groups for an application
   * Requirements: 4.4
   */
  async getGroupsForApplication(applicationId: string): Promise<string[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/application-groups?applicationId=${encodeURIComponent(applicationId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new DataError(
            DataErrorType.NOT_FOUND,
            'Application not found',
            404
          );
        }
        const error = await response.json() as { message?: string };
        throw new DataError(
          DataErrorType.INTERNAL_ERROR,
          error.message || 'Failed to get groups for application',
          response.status
        );
      }

      const result = await response.json() as { groups: string[] };
      return result.groups;
    } catch (error) {
      if (error instanceof DataError) {
        throw error;
      }
      throw new DataError(
        DataErrorType.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  /**
   * Get applications for a group
   * Requirements: 4.4
   */
  async getApplicationsForGroup(groupId: string): Promise<Application[]> {
    return this.getApplicationsByGroup(groupId);
  }

  /**
   * Validate application request
   * Requirements: 4.1, 4.2, 4.3
   */
  private validateApplicationRequest(request: CreateApplicationRequest): void {
    if (!request.name || request.name.trim().length === 0) {
      throw new DataError(
        DataErrorType.VALIDATION_ERROR,
        'Application name is required'
      );
    }

    if (!request.type || !['REST', 'MCP', 'INBUILT'].includes(request.type)) {
      throw new DataError(
        DataErrorType.VALIDATION_ERROR,
        'Valid application type is required (REST, MCP, or INBUILT)'
      );
    }

    if (!request.config) {
      throw new DataError(
        DataErrorType.VALIDATION_ERROR,
        'Application configuration is required'
      );
    }

    this.validateApplicationConfig(request.type, request.config);
  }

  /**
   * Validate application configuration based on type
   * Requirements: 4.1, 4.2, 4.3
   */
  private validateApplicationConfig(type: ApplicationType, config: ApplicationConfig): void {
    switch (type) {
      case 'REST':
        if (!config.url) {
          throw new DataError(
            DataErrorType.VALIDATION_ERROR,
            'REST applications must have a URL in config'
          );
        }
        if (!this.isValidUrl(config.url)) {
          throw new DataError(
            DataErrorType.VALIDATION_ERROR,
            'Invalid URL format for REST application'
          );
        }
        break;
      
      case 'MCP':
        if (!config.transport) {
          throw new DataError(
            DataErrorType.VALIDATION_ERROR,
            'MCP applications must have a transport type in config'
          );
        }
        break;
      
      case 'INBUILT':
        if (!config.component) {
          throw new DataError(
            DataErrorType.VALIDATION_ERROR,
            'Inbuilt applications must have a component name in config'
          );
        }
        break;
      
      default:
        throw new DataError(
          DataErrorType.VALIDATION_ERROR,
          'Invalid application type'
        );
    }
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create REST application helper
   * Requirements: 4.1
   */
  async createRestApplication(
    name: string,
    url: string,
    options?: {
      description?: string;
      method?: string;
      headers?: Record<string, string>;
      queryParams?: Record<string, string>;
      remarks?: string;
      groups?: string[];
      version?: string;
    }
  ): Promise<Application> {
    const config: ApplicationConfig = {
      url,
      method: options?.method || 'GET',
      headers: options?.headers,
      queryParams: options?.queryParams,
    };

    return this.createApplication({
      type: 'REST',
      name,
      description: options?.description,
      config,
      remarks: options?.remarks,
      groups: options?.groups,
      version: options?.version,
    });
  }

  /**
   * Create MCP application helper
   * Requirements: 4.2
   */
  async createMcpApplication(
    name: string,
    transport: string,
    mcpParams: Record<string, any>,
    options?: {
      description?: string;
      remarks?: string;
      groups?: string[];
      version?: string;
    }
  ): Promise<Application> {
    const config: ApplicationConfig = {
      transport,
      mcpParams,
    };

    return this.createApplication({
      type: 'MCP',
      name,
      description: options?.description,
      config,
      remarks: options?.remarks,
      groups: options?.groups,
      version: options?.version,
    });
  }

  /**
   * Create Inbuilt application helper
   * Requirements: 4.3
   */
  async createInbuiltApplication(
    name: string,
    component: string,
    options?: {
      description?: string;
      props?: Record<string, any>;
      remarks?: string;
      groups?: string[];
      version?: string;
    }
  ): Promise<Application> {
    const config: ApplicationConfig = {
      component,
      props: options?.props,
    };

    return this.createApplication({
      type: 'INBUILT',
      name,
      description: options?.description,
      config,
      remarks: options?.remarks,
      groups: options?.groups,
      version: options?.version,
    });
  }
}