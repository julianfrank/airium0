// AppSync GraphQL Subscription Components
export {
  EventSubscriptions,
  SubscriptionStatus,
  VoiceSessionEvents,
  ChatEvents,
  UIControlEvents
} from './EventSubscriptions';

export type {
  EventSubscriptionsProps,
  SubscriptionStatusProps,
  VoiceSessionEventsProps,
  ChatEventsProps,
  UIControlEventsProps
} from './EventSubscriptions';

export {
  SubscriptionProvider,
  useSubscriptionContext,
  SubscriptionProviderStatus,
  withSubscriptions
} from './SubscriptionProvider';

export type {
  SubscriptionProviderProps,
  SubscriptionContextValue,
  SubscriptionProviderStatusProps
} from './SubscriptionProvider';

// Re-export hooks for convenience
export {
  useEventSubscription,
  useVoiceSessionSubscription,
  useChatSubscription,
  useUIControlSubscription,
  useNotesSubscription,
  useUserSubscriptions,
  useSubscriptionManager
} from '../lib/use-appsync-subscriptions';

export type {
  UseSubscriptionResult
} from '../lib/use-appsync-subscriptions';

// Re-export client utilities
export {
  appSyncClient,
  initializeAppSyncClient,
  getAppSyncClient,
  isAppSyncClientReady
} from '../lib/appsync-client';

export type {
  AppSyncClientConfig
} from '../lib/appsync-client';

// Re-export subscription manager
export {
  subscriptionManager
} from '../lib/subscription-manager';

export type {
  EventHandler,
  ErrorHandler,
  ConnectionHandler,
  SubscriptionOptions,
  ActiveSubscription
} from '../lib/subscription-manager';