import type { WebSocketMessage } from '@airium/shared/types';

export interface WebSocketClientConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
}

export interface WebSocketClientEvents {
  onConnect?: () => void;
  onDisconnect?: (code: number, reason: string) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Event) => void;
  onReconnecting?: (attempt: number) => void;
  onReconnectFailed?: () => void;
}

export enum WebSocketState {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTING = 'DISCONNECTING',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
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

  constructor(config: WebSocketClientConfig, events: WebSocketClientEvents = {}) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      connectionTimeout: 10000,
      ...config
    };
    this.events = events;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state === WebSocketState.CONNECTED || this.state === WebSocketState.CONNECTING) {
        resolve();
        return;
      }

      this.isManualDisconnect = false;
      this.setState(WebSocketState.CONNECTING);

      try {
        this.ws = new WebSocket(this.config.url);
        this.setupEventListeners(resolve, reject);
        this.startConnectionTimeout(reject);
      } catch (error) {
        this.setState(WebSocketState.ERROR);
        reject(error);
      }
    });
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
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send message:', error);
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
}