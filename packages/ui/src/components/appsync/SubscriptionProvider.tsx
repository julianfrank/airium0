import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initializeAppSyncClient, isAppSyncClientReady } from '../../lib/appsync-client';
import { subscriptionManager } from '../../lib/subscription-manager';
import type { AppSyncClientConfig } from '../../lib/appsync-client';

/**
 * Subscription Provider Context
 * 
 * This component provides a React context for managing AppSync subscriptions
 * across the application with proper initialization and cleanup.
 */

export interface SubscriptionContextValue {
  isReady: boolean;
  isInitialized: boolean;
  error: Error | null;
  activeSubscriptions: number;
  initialize: () => Promise<void>;
  cleanup: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export interface SubscriptionProviderProps {
  children: ReactNode;
  config?: AppSyncClientConfig;
  autoInitialize?: boolean;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Provider component for AppSync subscriptions
 */
export function SubscriptionProvider({
  children,
  config,
  autoInitialize = true,
  onReady,
  onError
}: SubscriptionProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [activeSubscriptions, setActiveSubscriptions] = useState(0);

  const initialize = async () => {
    try {
      setError(null);
      
      // Initialize AppSync client
      if (!isAppSyncClientReady()) {
        initializeAppSyncClient(config);
      }

      // Initialize subscription manager
      if (!subscriptionManager.isReady()) {
        subscriptionManager.initialize();
      }

      setIsInitialized(true);
      setIsReady(true);

      if (onReady) {
        onReady();
      }

      console.log('Subscription provider initialized successfully');
    } catch (err) {
      const error = err as Error;
      setError(error);
      setIsReady(false);
      
      if (onError) {
        onError(error);
      }
      
      console.error('Failed to initialize subscription provider:', error);
    }
  };

  const cleanup = () => {
    try {
      subscriptionManager.cleanup();
      setIsReady(false);
      setIsInitialized(false);
      setActiveSubscriptions(0);
      setError(null);
      
      console.log('Subscription provider cleaned up');
    } catch (err) {
      console.error('Error during cleanup:', err);
    }
  };

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInitialize) {
      initialize();
    }

    return cleanup;
  }, [autoInitialize]);

  // Monitor active subscriptions
  useEffect(() => {
    if (!isReady) return;

    const updateActiveCount = () => {
      const count = subscriptionManager.getActiveSubscriptions().length;
      setActiveSubscriptions(count);
    };

    updateActiveCount();
    const interval = setInterval(updateActiveCount, 1000);

    return () => clearInterval(interval);
  }, [isReady]);

  const contextValue: SubscriptionContextValue = {
    isReady,
    isInitialized,
    error,
    activeSubscriptions,
    initialize,
    cleanup
  };

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
}

/**
 * Hook to use the subscription context
 */
export function useSubscriptionContext(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  
  if (!context) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  
  return context;
}

/**
 * Component for displaying subscription provider status
 */
export interface SubscriptionProviderStatusProps {
  showDetails?: boolean;
  className?: string;
}

export function SubscriptionProviderStatus({
  showDetails = false,
  className = ''
}: SubscriptionProviderStatusProps) {
  const { isReady, isInitialized, error, activeSubscriptions, initialize } = useSubscriptionContext();

  if (!showDetails && isReady && !error) {
    return null;
  }

  return (
    <div className={`subscription-provider-status ${className}`}>
      <div className="flex items-center gap-2 p-2 bg-gray-50 border rounded">
        <div className={`w-2 h-2 rounded-full ${
          isReady ? 'bg-green-500' : error ? 'bg-red-500' : 'bg-yellow-500'
        }`} />
        
        <span className="text-sm">
          {isReady ? 'Ready' : error ? 'Error' : 'Initializing...'}
        </span>

        {showDetails && (
          <span className="text-xs text-gray-600">
            ({activeSubscriptions} active)
          </span>
        )}

        {error && (
          <button
            onClick={initialize}
            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        )}
      </div>

      {error && (
        <div className="mt-1 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700">
          {error.message}
        </div>
      )}
    </div>
  );
}

/**
 * HOC for components that need subscription context
 */
export function withSubscriptions<P extends object>(
  Component: React.ComponentType<P>,
  config?: AppSyncClientConfig
) {
  return function WrappedComponent(props: P) {
    return (
      <SubscriptionProvider config={config}>
        <Component {...props} />
      </SubscriptionProvider>
    );
  };
}

export default SubscriptionProvider;