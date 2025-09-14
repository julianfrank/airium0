import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { appSyncClient, initializeAppSyncClient, getAppSyncClient, isAppSyncClientReady } from '../lib/appsync-client';

// Mock aws-amplify
vi.mock('aws-amplify/api', () => ({
  generateClient: vi.fn(() => ({
    graphql: vi.fn()
  }))
}));

describe('AppSync Client', () => {
  beforeEach(() => {
    appSyncClient.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should initialize client successfully', () => {
      const config = {
        graphqlEndpoint: 'https://test.appsync-api.us-east-1.amazonaws.com/graphql',
        region: 'us-east-1',
        authenticationType: 'AMAZON_COGNITO_USER_POOLS' as const
      };

      const client = initializeAppSyncClient(config);
      
      expect(client.isReady()).toBe(true);
      expect(client.getConfig()).toEqual(expect.objectContaining(config));
    });

    it('should handle configuration without parameters', () => {
      const client = initializeAppSyncClient();
      
      expect(client.isReady()).toBe(true);
    });

    it('should throw error when getting client before configuration', () => {
      expect(() => getAppSyncClient()).toThrow('AppSync client is not configured');
    });

    it('should return false for isReady before configuration', () => {
      expect(isAppSyncClientReady()).toBe(false);
    });
  });

  describe('Client Management', () => {
    beforeEach(() => {
      initializeAppSyncClient();
    });

    it('should return configured client', () => {
      const client = getAppSyncClient();
      expect(client).toBeDefined();
      expect(client.graphql).toBeDefined();
    });

    it('should return true for isReady after configuration', () => {
      expect(isAppSyncClientReady()).toBe(true);
    });

    it('should reset client state', () => {
      appSyncClient.reset();
      
      expect(isAppSyncClientReady()).toBe(false);
      expect(() => getAppSyncClient()).toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle configuration errors gracefully', () => {
      // Mock generateClient to throw error
      const { generateClient } = require('aws-amplify/api');
      generateClient.mockImplementationOnce(() => {
        throw new Error('Configuration failed');
      });

      const client = initializeAppSyncClient();
      
      expect(client.isReady()).toBe(false);
    });
  });
});