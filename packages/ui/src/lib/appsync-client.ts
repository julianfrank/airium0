import { generateClient } from 'aws-amplify/api';
import { Amplify } from 'aws-amplify';
import type { 
  AppSyncEvent, 
  VoiceSessionEvent, 
  ChatEvent, 
  UIControlEvent,
  EventSubscription 
} from '@airium/shared';

/**
 * AppSync GraphQL Client Configuration
 * 
 * This module provides a configured GraphQL client for AppSync subscriptions
 * and mutations. It handles authentication and connection management.
 */

export interface AppSyncClientConfig {
  graphqlEndpoint?: string;
  region?: string;
  authenticationType?: 'AMAZON_COGNITO_USER_POOLS' | 'AWS_IAM';
}

class AppSyncClient {
  private client: any;
  private isConfigured = false;
  private config: AppSyncClientConfig = {};

  constructor() {
    this.client = null;
  }

  /**
   * Configure the AppSync client with Amplify configuration
   */
  configure(config?: AppSyncClientConfig) {
    try {
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Generate the GraphQL client using Amplify
      this.client = generateClient();
      this.isConfigured = true;
      
      console.log('AppSync GraphQL client configured successfully');
    } catch (error) {
      console.error('Failed to configure AppSync client:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Check if the client is properly configured
   */
  isReady(): boolean {
    return this.isConfigured && this.client !== null;
  }

  /**
   * Get the configured GraphQL client
   */
  getClient() {
    if (!this.isReady()) {
      throw new Error('AppSync client is not configured. Call configure() first.');
    }
    return this.client;
  }

  /**
   * Get client configuration
   */
  getConfig(): AppSyncClientConfig {
    return { ...this.config };
  }

  /**
   * Reset the client configuration
   */
  reset() {
    this.client = null;
    this.isConfigured = false;
    this.config = {};
  }
}

// Singleton instance
export const appSyncClient = new AppSyncClient();

/**
 * Initialize AppSync client with Amplify configuration
 * This should be called after Amplify.configure()
 */
export const initializeAppSyncClient = (config?: AppSyncClientConfig) => {
  appSyncClient.configure(config);
  return appSyncClient;
};

/**
 * Get the configured AppSync GraphQL client
 */
export const getAppSyncClient = () => {
  return appSyncClient.getClient();
};

/**
 * Check if AppSync client is ready for use
 */
export const isAppSyncClientReady = () => {
  return appSyncClient.isReady();
};

export default appSyncClient;