import type { WebSocketMessage } from '@airium/shared';

// Re-export for other modules
export type { WebSocketMessage };
import { amplifyOutputs } from './amplify';
import { withRetry, retryConditions, CircuitBreaker } from './retry-utils';

export interface WebSocketClientConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
  enableCircuitBreaker?: boolean;
  enableRetry?: boolean;
}

export interface WebSocketClientEvents {
  onConnect?: () => void;
  onDisconnect?: (code: number, reason: string) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Event | Error) => void;
  onReconnecting?: (attempt: number) => void;
  onReconnectFailed?: () => void;
  onCircuitBreakerOpen?: () => void;
  onCircuitBreakerClosed?: () => void;
}

export enum WebSocketState {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTING = 'DISCONNECTING',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

// Helper function to get WebSocket URL from Amplify configuration
export function getWebSocketUrl(): string {
  // Try to get from amplify_outputs.json custom configuration
  if (amplifyOutputs.custom?.websocket_api_url) {
    return amplifyOutputs.custom.websocket_api_url;
  }
  
  // Fallback to environment variable
  if (typeof process !== 'undefined' && process.env?.WEBSOCKET_API_URL) {
    return process.env.WEBSOCKET_API_URL;
  }
  
  // Development fallback
  console.warn('WebSocket URL not configured, using placeholder');
  return 'wss://placeholder.execute-api.us-east-1.amazonaws.com/production';
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketClientConfig>;
  private events: WebSocketClientEvents;
  private state: WebSocketState = WebSocketState.DISCONNECTED;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private isManualDisconnect = false;
  private circuitBreaker: CircuitBreaker | null = null;
  private lastErrorTime = 0;
  private errorCount = 0;

  constructor(config: WebSocketClientConfig, events: WebSocketClientEvents = {}) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      connectionTimeout: 10000,
      enableCircuitBreaker: true,
      enableRetry: true,
      ...config
    };
    this.events = events;
    
    if (this.config.enableCircuitBreaker) {
      this.circuitBreaker = new CircuitBreaker(3, 30000); // 3 failures, 30s recovery
    }
  }

  public connect(): Promise<void> {
    const connectOperation = () => new Promise<void>((resolve, reject) => {
      if (this.state === WebSocketState.CONNECTED || this.state === WebSocketState.CONNECTING) {
        resolve();
        return;
      }

      // Check circuit breaker
      if (this.circuitBreaker) {
        const breakerState = this.circuitBreaker.getState();
        if (breakerState.state === 'OPEN') {
          const error = new Error('Circuit breaker is OPEN - too many connection failures');
          this.events.onCircuitBreakerOpen?.();
          reject(error);
          return;
        }
      }

      this.isManualDisconnect = false;
      this.setState(WebSocketState.CONNECTING);

      try {
        this.ws = new WebSocket(this.config.url);
        this.setupEventListeners(resolve, reject);
        this.startConnectionTimeout(reject);
      } catch (error) {
        this.handleConnectionError(error as Error);
        reject(error);
      }
    });

    if (this.config.enableRetry) {
      return withRetry(connectOperation, {
        maxAttempts: 3,
        baseDelay: 1000,
        retryCondition: retryConditions.websocketErrors,
        onRetry: (attempt, error) => {
          console.warn(`WebSocket connection attempt ${attempt} failed:`, error);
        }
      });
    }

    return connectOperation();
  }

  public disconnect(): void {
    this.isManualDisconnect = true;
    this.clearTimers();
    
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.setState(WebSocketState.DISCONNECTING);
      this.ws.close(1000, 'Manual disconnect');
    } else {
      this.setState(WebSocketState.DISCONNECTED);
    }
  }

  public send(message: WebSocketMessage): boolean {
    if (this.state === WebSocketState.CONNECTED && this.ws) {
      try {
        // Execute through circuit breaker if enabled
        if (this.circuitBreaker) {
          this.circuitBreaker.execute(() => {
            this.ws!.send(JSON.stringify(message));
            return Promise.resolve();
          }).catch((error) => {
            console.error('Circuit breaker prevented message send:', error);
            this.queueMessage(message);
          });
        } else {
          this.ws.send(JSON.stringify(message));
        }
        return true;
      } catch (error) {
        console.error('Failed to send message:', error);
        this.handleSendError(error as Error);
        this.queueMessage(message);
        return false;
      }
    } else {
      this.queueMessage(message);
      return false;
    }
  }

  public getState(): WebSocketState {
    return this.state;
  }

  public isConnected(): boolean {
    return this.state === WebSocketState.CONNECTED;
  }

  private setupEventListeners(resolve: () => void, reject: (error: any) => void): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.clearConnectionTimeout();
      this.setState(WebSocketState.CONNECTED);
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.processMessageQueue();
      this.events.onConnect?.();
      resolve();
    };

    this.ws.onclose = (event) => {
      this.clearTimers();
      
      if (this.isManualDisconnect) {
        this.setState(WebSocketState.DISCONNECTED);
        this.events.onDisconnect?.(event.code, event.reason);
      } else {
        this.setState(WebSocketState.DISCONNECTED);
        this.events.onDisconnect?.(event.code, event.reason);
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      this.clearConnectionTimeout();
      this.setState(WebSocketState.ERROR);
      this.events.onError?.(error);
      
      if (this.state === WebSocketState.CONNECTING) {
        reject(error);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.events.onMessage?.(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
  }

  private setState(newState: WebSocketState): void {
    this.state = newState;
  }

  private attemptReconnect(): void {
    if (this.isManualDisconnect || this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
        this.events.onReconnectFailed?.();
      }
      return;
    }

    this.reconnectAttempts++;
    this.setState(WebSocketState.RECONNECTING);
    this.events.onReconnecting?.(this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Reconnection failed, will try again or give up based on max attempts
      });
    }, this.config.reconnectInterval);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.state === WebSocketState.CONNECTED) {
        this.send({ action: 'ping' });
      }
    }, this.config.heartbeatInterval);
  }

  private startConnectionTimeout(reject?: (error: any) => void): void {
    this.connectionTimer = setTimeout(() => {
      if (this.state === WebSocketState.CONNECTING && this.ws) {
        this.ws.close();
        this.setState(WebSocketState.ERROR);
        if (reject) {
          reject(new Error('Connection timeout'));
        }
      }
    }, this.config.connectionTimeout);
  }

  private clearConnectionTimeout(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearConnectionTimeout();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private queueMessage(message: WebSocketMessage): void {
    this.messageQueue.push(message);
    
    // Limit queue size to prevent memory issues
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift();
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.state === WebSocketState.CONNECTED) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  private handleConnectionError(error: Error): void {
    this.errorCount++;
    this.lastErrorTime = Date.now();
    this.setState(WebSocketState.ERROR);
    
    // Report error with context
    const errorReport = {
      type: 'websocket_connection_error',
      message: error.message,
      errorCount: this.errorCount,
      reconnectAttempts: this.reconnectAttempts,
      timestamp: new Date().toISOString(),
    };
    
    console.error('WebSocket connection error:', errorReport);
    this.events.onError?.(error);
  }

  private handleSendError(error: Error): void {
    const errorReport = {
      type: 'websocket_send_error',
      message: error.message,
      state: this.state,
      timestamp: new Date().toISOString(),
    };
    
    console.error('WebSocket send error:', errorReport);
    this.events.onError?.(error);
  }

  public getConnectionHealth(): {
    state: WebSocketState;
    errorCount: number;
    lastErrorTime: number;
    reconnectAttempts: number;
    queuedMessages: number;
    circuitBreakerState?: any;
  } {
    return {
      state: this.state,
      errorCount: this.errorCount,
      lastErrorTime: this.lastErrorTime,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      circuitBreakerState: this.circuitBreaker?.getState(),
    };
  }
}