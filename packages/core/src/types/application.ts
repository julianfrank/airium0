/**
 * Application management specific types
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

export type ApplicationType = 'REST' | 'MCP' | 'INBUILT';

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

export interface Application {
  appId: string;
  type: ApplicationType;
  name: string;
  description?: string;
  config: ApplicationConfig;
  remarks?: string;
  groups: string[];
  isActive: boolean;
  version: string;
  createdAt: string;
  updatedAt: string;
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

export interface ApplicationGroupAssociation {
  applicationId: string;
  groupId: string;
  action: 'ADD' | 'REMOVE';
}

// REST Application specific types
export interface RestApplicationConfig extends ApplicationConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export interface CreateRestApplicationRequest {
  name: string;
  description?: string;
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  remarks?: string;
  groups?: string[];
  version?: string;
  timeout?: number;
  retries?: number;
}

// MCP Application specific types
export interface McpApplicationConfig extends ApplicationConfig {
  transport: string;
  mcpParams: Record<string, any>;
  connectionTimeout?: number;
  maxRetries?: number;
}

export interface CreateMcpApplicationRequest {
  name: string;
  description?: string;
  transport: string;
  mcpParams: Record<string, any>;
  remarks?: string;
  groups?: string[];
  version?: string;
  connectionTimeout?: number;
  maxRetries?: number;
}

// Inbuilt Application specific types
export interface InbuiltApplicationConfig extends ApplicationConfig {
  component: string;
  props?: Record<string, any>;
  route?: string;
  permissions?: string[];
}

export interface CreateInbuiltApplicationRequest {
  name: string;
  description?: string;
  component: string;
  props?: Record<string, any>;
  route?: string;
  permissions?: string[];
  remarks?: string;
  groups?: string[];
  version?: string;
}

// Application usage and analytics
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

export interface ApplicationMetrics {
  applicationId: string;
  totalUsage: number;
  successRate: number;
  averageResponseTime: number;
  errorCount: number;
  lastUsed: string;
  topUsers: Array<{
    userId: string;
    usageCount: number;
  }>;
}

// Application validation and testing
export interface ApplicationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  configValidation: {
    isValid: boolean;
    errors: string[];
  };
  connectivityTest?: {
    success: boolean;
    responseTime?: number;
    error?: string;
  };
}

export interface ApplicationTestRequest {
  applicationId: string;
  testParameters?: Record<string, any>;
  validateConfig?: boolean;
  testConnectivity?: boolean;
}

// Application search and filtering
export interface ApplicationFilter {
  type?: ApplicationType;
  groups?: string[];
  isActive?: boolean;
  searchTerm?: string;
  createdAfter?: string;
  createdBefore?: string;
}

export interface ApplicationSearchRequest {
  filter?: ApplicationFilter;
  sortBy?: 'name' | 'type' | 'createdAt' | 'updatedAt';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export interface ApplicationSearchResult {
  applications: Application[];
  totalCount: number;
  hasMore: boolean;
}

// Application export/import
export interface ApplicationExport {
  applications: Application[];
  exportedAt: string;
  exportedBy: string;
  version: string;
}

export interface ApplicationImportRequest {
  applications: Omit<Application, 'appId' | 'createdAt' | 'updatedAt'>[];
  overwriteExisting?: boolean;
  validateBeforeImport?: boolean;
}

export interface ApplicationImportResult {
  imported: number;
  skipped: number;
  errors: Array<{
    application: string;
    error: string;
  }>;
}

// Error types specific to application management
export enum ApplicationErrorType {
  INVALID_CONFIG = 'INVALID_CONFIG',
  CONNECTIVITY_ERROR = 'CONNECTIVITY_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  APPLICATION_NOT_FOUND = 'APPLICATION_NOT_FOUND',
  GROUP_NOT_FOUND = 'GROUP_NOT_FOUND',
  DUPLICATE_NAME = 'DUPLICATE_NAME',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class ApplicationError extends Error {
  constructor(
    public type: ApplicationErrorType,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

// Constants for application management
export const APPLICATION_CONSTANTS = {
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_REMARKS_LENGTH: 1000,
  MAX_GROUPS_PER_APPLICATION: 50,
  SUPPORTED_HTTP_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const,
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  DEFAULT_RETRIES: 3,
  VERSION_PATTERN: /^\d+\.\d+\.\d+$/,
} as const;

// Application configuration templates
export const APPLICATION_TEMPLATES = {
  REST: {
    SIMPLE_GET: {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
      retries: 2,
    },
    AUTHENTICATED_API: {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${token}',
      },
      timeout: 15000,
      retries: 3,
    },
  },
  MCP: {
    WEBSOCKET: {
      transport: 'websocket',
      mcpParams: {
        protocol: 'mcp/1.0',
        capabilities: ['tools', 'resources'],
      },
      connectionTimeout: 5000,
      maxRetries: 3,
    },
    HTTP: {
      transport: 'http',
      mcpParams: {
        protocol: 'mcp/1.0',
        capabilities: ['tools'],
      },
      connectionTimeout: 10000,
      maxRetries: 2,
    },
  },
  INBUILT: {
    DASHBOARD: {
      component: 'Dashboard',
      props: {
        layout: 'grid',
        refreshInterval: 30000,
      },
      permissions: ['read'],
    },
    SETTINGS: {
      component: 'Settings',
      props: {
        sections: ['general', 'security'],
      },
      permissions: ['read', 'write'],
    },
  },
} as const;