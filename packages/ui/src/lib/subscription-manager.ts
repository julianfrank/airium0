import { getAppSyncClient, isAppSyncClientReady } from './appsync-client';
import {
  ON_EVENT,
  ON_VOICE_SESSION_EVENT,
  ON_CHAT_EVENT,
  ON_UI_CONTROL_EVENT,
  ON_NOTES_EVENT
} from './graphql/queries';
import type { 
  AppSyncEvent, 
  VoiceSessionEvent, 
  ChatEvent, 
  UIControlEvent,
  EventSubscription 
} from '@airium/shared';

/**
 * Subscription Manager for AppSync GraphQL Subscriptions
 * 
 * This class manages the lifecycle of GraphQL subscriptions,
 * handles connection management, and provides event callbacks.
 */

export type EventHandler<T = any> = (event: T) => void | Promise<void>;
export type ErrorHandler = (error: Error) => void;
export type ConnectionHandler = () => void;

export interface SubscriptionOptions {
  onEvent?: EventHandler;
  onError?: ErrorHandler;
  onConnected?: ConnectionHandler;
  onDisconnected?: ConnectionHandler;
  autoReconnect?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export interface ActiveSubscription {
  id: string;
  type: string;
  subscription: any;
  variables: Record<string, any>;
  options: SubscriptionOptions;
  retryCount: number;
  isActive: boolean;
}

class SubscriptionManager {
  private subscriptions = new Map<string, ActiveSubscription>();
  private isInitialized = false;
  private defaultOptions: SubscriptionOptions = {
    autoReconnect: true,
    maxRetries: 3,
    retryDelay: 1000,
  };

  /**
   * Initialize the subscription manager
   */
  initialize() {
    if (!isAppSyncClientReady()) {
      throw new Error('AppSync client is not ready. Configure it first.');
    }
    this.isInitialized = true;
    console.log('Subscription manager initialized');
  }

  /**
   * Subscribe to general events for a user
   */
  subscribeToEvents(
    userId: string, 
    options: SubscriptionOptions = {}
  ): string {
    return this.createSubscription(
      'events',
      ON_EVENT,
      { userId },
      { ...this.defaultOptions, ...options }
    );
  }

  /**
   * Subscribe to voice session events
   */
  subscribeToVoiceSession(
    sessionId: string,
    options: SubscriptionOptions = {}
  ): string {
    return this.createSubscription(
      'voice_session',
      ON_VOICE_SESSION_EVENT,
      { sessionId },
      { ...this.defaultOptions, ...options }
    );
  }

  /**
   * Subscribe to chat events for a user
   */
  subscribeToChat(
    userId: string,
    options: SubscriptionOptions = {}
  ): string {
    return this.createSubscription(
      'chat',
      ON_CHAT_EVENT,
      { userId },
      { ...this.defaultOptions, ...options }
    );
  }

  /**
   * Subscribe to UI control events for a user
   */
  subscribeToUIControl(
    userId: string,
    options: SubscriptionOptions = {}
  ): string {
    return this.createSubscription(
      'ui_control',
      ON_UI_CONTROL_EVENT,
      { userId },
      { ...this.defaultOptions, ...options }
    );
  }

  /**
   * Subscribe to notes events for a user
   */
  subscribeToNotes(
    userId: string,
    options: SubscriptionOptions = {}
  ): string {
    return this.createSubscription(
      'notes',
      ON_NOTES_EVENT,
      { userId },
      { ...this.defaultOptions, ...options }
    );
  }

  /**
   * Create a new subscription
   */
  private createSubscription(
    type: string,
    query: any,
    variables: Record<string, any>,
    options: SubscriptionOptions
  ): string {
    if (!this.isInitialized) {
      throw new Error('Subscription manager is not initialized');
    }

    const subscriptionId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const client = getAppSyncClient();
      const subscription = client.graphql({
        query,
        variables
      }).subscribe({
        next: (result: any) => {
          const eventData = result.data[Object.keys(result.data)[0]];
          this.handleSubscriptionEvent(subscriptionId, eventData, options);
        },
        error: (error: Error) => {
          this.handleSubscriptionError(subscriptionId, error, options);
        },
        complete: () => {
          this.handleSubscriptionComplete(subscriptionId, options);
        }
      });

      const activeSubscription: ActiveSubscription = {
        id: subscriptionId,
        type,
        subscription,
        variables,
        options,
        retryCount: 0,
        isActive: true
      };

      this.subscriptions.set(subscriptionId, activeSubscription);
      
      // Call connection handler
      if (options.onConnected) {
        options.onConnected();
      }

      console.log(`Created subscription: ${subscriptionId} (${type})`);
      return subscriptionId;

    } catch (error) {
      console.error(`Failed to create subscription ${subscriptionId}:`, error);
      if (options.onError) {
        options.onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * Handle subscription events
   */
  private handleSubscriptionEvent(
    subscriptionId: string,
    eventData: any,
    options: SubscriptionOptions
  ) {
    try {
      if (options.onEvent) {
        options.onEvent(eventData);
      }
      
      // Reset retry count on successful event
      const subscription = this.subscriptions.get(subscriptionId);
      if (subscription) {
        subscription.retryCount = 0;
      }
    } catch (error) {
      console.error(`Error handling event for subscription ${subscriptionId}:`, error);
      if (options.onError) {
        options.onError(error as Error);
      }
    }
  }

  /**
   * Handle subscription errors
   */
  private handleSubscriptionError(
    subscriptionId: string,
    error: Error,
    options: SubscriptionOptions
  ) {
    console.error(`Subscription error for ${subscriptionId}:`, error);
    
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    subscription.isActive = false;

    if (options.onError) {
      options.onError(error);
    }

    // Handle auto-reconnection
    if (options.autoReconnect && subscription.retryCount < (options.maxRetries || 3)) {
      subscription.retryCount++;
      const delay = (options.retryDelay || 1000) * Math.pow(2, subscription.retryCount - 1);
      
      console.log(`Retrying subscription ${subscriptionId} in ${delay}ms (attempt ${subscription.retryCount})`);
      
      setTimeout(() => {
        this.retrySubscription(subscriptionId);
      }, delay);
    } else {
      console.error(`Max retries exceeded for subscription ${subscriptionId}`);
      this.unsubscribe(subscriptionId);
    }
  }

  /**
   * Handle subscription completion
   */
  private handleSubscriptionComplete(
    subscriptionId: string,
    options: SubscriptionOptions
  ) {
    console.log(`Subscription completed: ${subscriptionId}`);
    
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.isActive = false;
    }

    if (options.onDisconnected) {
      options.onDisconnected();
    }
  }

  /**
   * Retry a failed subscription
   */
  private retrySubscription(subscriptionId: string) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    try {
      // Clean up old subscription
      if (subscription.subscription) {
        subscription.subscription.unsubscribe();
      }

      // Create new subscription with same parameters
      const newSubscriptionId = this.createSubscription(
        subscription.type,
        this.getQueryForType(subscription.type),
        subscription.variables,
        subscription.options
      );

      // Remove old subscription
      this.subscriptions.delete(subscriptionId);
      
      console.log(`Successfully retried subscription: ${subscriptionId} -> ${newSubscriptionId}`);
    } catch (error) {
      console.error(`Failed to retry subscription ${subscriptionId}:`, error);
    }
  }

  /**
   * Get GraphQL query for subscription type
   */
  private getQueryForType(type: string) {
    switch (type) {
      case 'events': return ON_EVENT;
      case 'voice_session': return ON_VOICE_SESSION_EVENT;
      case 'chat': return ON_CHAT_EVENT;
      case 'ui_control': return ON_UI_CONTROL_EVENT;
      case 'notes': return ON_NOTES_EVENT;
      default: throw new Error(`Unknown subscription type: ${type}`);
    }
  }

  /**
   * Unsubscribe from a specific subscription
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      console.warn(`Subscription not found: ${subscriptionId}`);
      return false;
    }

    try {
      if (subscription.subscription) {
        subscription.subscription.unsubscribe();
      }
      
      subscription.isActive = false;
      this.subscriptions.delete(subscriptionId);
      
      console.log(`Unsubscribed: ${subscriptionId}`);
      return true;
    } catch (error) {
      console.error(`Error unsubscribing ${subscriptionId}:`, error);
      return false;
    }
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll(): void {
    const subscriptionIds = Array.from(this.subscriptions.keys());
    
    for (const id of subscriptionIds) {
      this.unsubscribe(id);
    }
    
    console.log(`Unsubscribed from ${subscriptionIds.length} subscriptions`);
  }

  /**
   * Get active subscriptions
   */
  getActiveSubscriptions(): ActiveSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => sub.isActive);
  }

  /**
   * Get subscription by ID
   */
  getSubscription(subscriptionId: string): ActiveSubscription | undefined {
    return this.subscriptions.get(subscriptionId);
  }

  /**
   * Check if manager is initialized
   */
  isReady(): boolean {
    return this.isInitialized && isAppSyncClientReady();
  }

  /**
   * Cleanup and reset the manager
   */
  cleanup(): void {
    this.unsubscribeAll();
    this.isInitialized = false;
    console.log('Subscription manager cleaned up');
  }
}

// Singleton instance
export const subscriptionManager = new SubscriptionManager();

export default subscriptionManager;