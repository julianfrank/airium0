import { generateClient } from 'aws-amplify/api';
import { Amplify } from 'aws-amplify';
import { withRetry, retryConditions, CircuitBreaker } from './retry-utils';
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
  enableRetry?: boolean;
  enableCircuitBreaker?: boolean;
  maxRetryAttempts?: number;
}

export interface AppSyncError extends Error {
  graphQLErrors?: any[];
  networkError?: any;
  operation?: string;
}

class AppSyncClient {
  private client: any;
  private isConfigured = false;
  private config: AppSyncClientConfig = {};
  private circuitBreaker: CircuitBreaker | null = null;
  private errorCount = 0;
  private lastErrorTime = 0;

  constructor() {
    this.client = null;
  }

  /**
   * Configure the AppSync client with Amplify configuration
   */
  configure(config?: AppSyncClientConfig) {
    try {
      const defaultConfig = {
        enableRetry: true,
        enableCircuitBreaker: true,
        maxRetryAttempts: 3,
      };

      if (config) {
        this.config = { ...defaultConfig, ...this.config, ...config };
      } else {
        this.config = { ...defaultConfig, ...this.config };
      }

      // Generate the GraphQL client using Amplify
      this.client = generateClient();
      this.isConfigured = true;
      
      // Initialize circuit breaker if enabled
      if (this.config.enableCircuitBreaker) {
        this.circuitBreaker = new CircuitBreaker(5, 60000); // 5 failures, 1 minute recovery
      }
      
      console.log('AppSync GraphQL client configured successfully');
    } catch (error) {
      console.error('Failed to configure AppSync client:', error);
      this.isConfigured = false;
      this.handleError(error as Error, 'configure');
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
    this.circuitBreaker = null;
    this.errorCount = 0;
    this.lastErrorTime = 0;
  }

  /**
   * Execute a GraphQL operation with error handling and retry logic
   */
  async executeOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    if (!this.isReady()) {
      throw new Error('AppSync client is not configured. Call configure() first.');
    }

    const executeWithErrorHandling = async (): Promise<T> => {
      try {
        if (this.circuitBreaker) {
          return await this.circuitBreaker.execute(operation);
        }
        return await operation();
      } catch (error) {
        this.handleError(error as Error, operationName);
        throw error;
      }
    };

    if (this.config.enableRetry) {
      return withRetry(executeWithErrorHandling, {
        maxAttempts: this.config.maxRetryAttempts || 3,
        baseDelay: 1000,
        retryCondition: (error: any) => {
          // Don't retry on authentication errors
          if (error.graphQLErrors?.some((e: any) => e.errorType === 'Unauthorized')) {
            return false;
          }
          return retryConditions.networkAndServerErrors(error);
        },
        onRetry: (attempt, error) => {
          console.warn(`AppSync operation ${operationName} retry attempt ${attempt}:`, error);
        }
      });
    }

    return executeWithErrorHandling();
  }

  /**
   * Handle and report errors
   */
  private handleError(error: Error, operation: string): void {
    this.errorCount++;
    this.lastErrorTime = Date.now();

    const appSyncError: AppSyncError = error as AppSyncError;
    
    const errorReport = {
      type: 'appsync_error',
      operation,
      message: error.message,
      graphQLErrors: appSyncError.graphQLErrors,
      networkError: appSyncError.networkError,
      errorCount: this.errorCount,
      timestamp: new Date().toISOString(),
    };

    console.error('AppSync error:', errorReport);

    // Store error for offline reporting
    try {
      const existingErrors = JSON.parse(localStorage.getItem('appSyncErrors') || '[]');
      existingErrors.push(errorReport);
      localStorage.setItem('appSyncErrors', JSON.stringify(existingErrors.slice(-20)));
    } catch (e) {
      console.error('Failed to store AppSync error:', e);
    }
  }

  /**
   * Get client health information
   */
  getHealth(): {
    isConfigured: boolean;
    errorCount: number;
    lastErrorTime: number;
    circuitBreakerState?: any;
  } {
    return {
      isConfigured: this.isConfigured,
      errorCount: this.errorCount,
      lastErrorTime: this.lastErrorTime,
      circuitBreakerState: this.circuitBreaker?.getState(),
    };
  }

  /**
   * Subscribe to GraphQL subscriptions with error handling
   */
  async subscribe<T>(
    subscription: any,
    variables?: any,
    onNext?: (data: T) => void,
    onError?: (error: Error) => void
  ) {
    return this.executeOperation(async () => {
      const observable = this.client.graphql({
        query: subscription,
        variables,
      });

      return observable.subscribe({
        next: (result: any) => {
          if (result.errors) {
            const error = new Error('GraphQL subscription error');
            (error as AppSyncError).graphQLErrors = result.errors;
            this.handleError(error, 'subscription');
            onError?.(error);
          } else {
            onNext?.(result.data);
          }
        },
        error: (error: Error) => {
          this.handleError(error, 'subscription');
          onError?.(error);
        },
      });
    }, 'subscribe');
  }

  /**
   * Execute GraphQL mutations with error handling
   */
  async mutate<T>(mutation: any, variables?: any): Promise<T> {
    return this.executeOperation(async () => {
      const result = await this.client.graphql({
        query: mutation,
        variables,
      });

      if (result.errors) {
        const error = new Error('GraphQL mutation error');
        (error as AppSyncError).graphQLErrors = result.errors;
        throw error;
      }

      return result.data;
    }, 'mutate');
  }

  /**
   * Execute GraphQL queries with error handling
   */
  async query<T>(query: any, variables?: any): Promise<T> {
    return this.executeOperation(async () => {
      const result = await this.client.graphql({
        query: query,
        variables,
      });

      if (result.errors) {
        const error = new Error('GraphQL query error');
        (error as AppSyncError).graphQLErrors = result.errors;
        throw error;
      }

      return result.data;
    }, 'query');
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