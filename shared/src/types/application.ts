export interface Application {
  PK: string;          // APP#${appId}
  SK: string;          // METADATA
  appId: string;
  type: 'REST' | 'MCP' | 'INBUILT';
  name: string;
  config: {
    url?: string;
    queryParams?: Record<string, string>;
    mcpParams?: Record<string, any>;
    transportType?: string;
  };
  remarks: string;
  groups: string[];
  createdAt: string;
}

export interface ApplicationData {
  type: 'REST' | 'MCP' | 'INBUILT';
  name: string;
  config: Application['config'];
  remarks: string;
  groups: string[];
}

export interface ApplicationService {
  createApplication(app: ApplicationData): Promise<Application>;
  updateApplication(id: string, updates: Partial<ApplicationData>): Promise<Application>;
  getApplicationsByGroup(groupId: string): Promise<Application[]>;
}