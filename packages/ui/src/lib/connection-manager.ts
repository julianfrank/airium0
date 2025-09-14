import { WebSocketClient, WebSocketMessage, WebSocketState } from './websocket-client';

export interface ConnectionManagerConfig {
  url: string;
  userId: string;
  sessionId: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  timeout?: number;
}

export interface ConnectionState {
  isConnected: boolean;
  userId: string;
  sessionId: string;
  connectionId?: string;
  lastActivity: Date;
  lastConnected?: Date;
  reconnectAttempts: number;
  state: WebSocketState;
}

export type ConnectionStateHandler = (state: ConnectionState) => void;
export type MessageHandler = (message: any) => void;

export class ConnectionManager {
  private client: WebSocketClient;
  private config: ConnectionManagerConfig;
  private state: ConnectionState;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private stateHandlers: ConnectionStateHandler[] = [];

  constructor(config: ConnectionManagerConfig) {
    this.config = config;
    this.state = {
      isConnected: false,
      userId: config.userId,
      sessionId: config.sessionId,
      lastActivity: new Date(),
      reconnectAttempts: 0,
      state: WebSocketState.DISCONNECTED
    };

    // Create WebSocket client with connection manager events
    this.client = new WebSocketClient(
      {
        url: config.url,
        connectionTimeout: config.timeout,
        maxReconnectAttempts: config.maxReconnectAttempts,
        reconnectInterval: config.reconnectInterval
      },
      {
        onConnect: () => this.handleConnect(),
        onDisconnect: () => this.handleDisconnect(),
        onMessage: (message) => this.handleMessage(message),
        onError: (error) => this.handleError(error),
        onReconnectFailed: () => this.handleReconnectFailed()
      }
    );
  }

  // Connection management
  async connect(): Promise<void> {
    await this.client.connect();
  }

  disconnect(): void {
    this.client.disconnect();
  }

  getConnectionState(): ConnectionState {
    return { 
      ...this.state,
      state: this.client.getState()
    };
  }

  getState(): ConnectionState {
    return this.getConnectionState();
  }

  isConnected(): boolean {
    return this.state.isConnected && this.client.getState() === WebSocketState.CONNECTED;
  }

  // Allow updating userId and sessionId
  updateConfig(updates: Partial<Pick<ConnectionManagerConfig, 'userId' | 'sessionId'>>): void {
    if (updates.userId) {
      this.config.userId = updates.userId;
      this.state.userId = updates.userId;
    }
    if (updates.sessionId) {
      this.config.sessionId = updates.sessionId;
      this.state.sessionId = updates.sessionId;
    }
  }

  setUserId(userId: string): void {
    this.config.userId = userId;
    this.state.userId = userId;
  }

  setSessionId(sessionId: string): void {
    this.config.sessionId = sessionId;
    this.state.sessionId = sessionId;
  }

  // Message handling
  onMessage(action: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(action)) {
      this.messageHandlers.set(action, []);
    }
    this.messageHandlers.get(action)!.push(handler);
  }

  offMessage(action: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(action);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // State change notifications
  onStateChange(handler: ConnectionStateHandler): void {
    this.stateHandlers.push(handler);
  }

  offStateChange(handler: ConnectionStateHandler): void {
    const index = this.stateHandlers.indexOf(handler);
    if (index > -1) {
      this.stateHandlers.splice(index, 1);
    }
  }

  onConnectionStateChange(handler: ConnectionStateHandler): () => void {
    this.stateHandlers.push(handler);
    return () => {
      const index = this.stateHandlers.indexOf(handler);
      if (index > -1) {
        this.stateHandlers.splice(index, 1);
      }
    };
  }

  // Convenience methods for common message types
  sendVoiceMessage(audioData: string, sessionId?: string): void {
    this.send({
      action: 'voice_message',
      data: { audioData },
      sessionId: sessionId || this.config.sessionId
    });
  }

  sendTextMessage(text: string): void {
    this.send({
      action: 'text_message',
      data: { text }
    });
  }

  startVoiceSession(): void {
    this.send({
      action: 'start_voice_session'
    });
  }

  endVoiceSession(sessionId?: string): void {
    this.send({
      action: 'end_voice_session',
      sessionId: sessionId || this.config.sessionId
    });
  }

  sendPing(): void {
    this.send({
      action: 'ping'
    });
  }

  // Core send method
  send(message: Partial<WebSocketMessage>): void {
    // Enrich message with user and session data
    const enrichedMessage: WebSocketMessage = {
      ...message,
      userId: message.userId || this.config.userId,
      sessionId: message.sessionId || this.config.sessionId,
      action: message.action || 'unknown'
    };

    this.client.send(enrichedMessage);
  }

  // Event handlers
  private handleConnect(): void {
    const now = new Date();
    this.state.isConnected = true;
    this.state.reconnectAttempts = 0;
    this.state.lastActivity = now;
    this.state.lastConnected = now;
    this.state.state = WebSocketState.CONNECTED;
    
    // Send connection initialization message
    this.send({
      action: 'connection_init',
      data: {
        userId: this.config.userId,
        sessionId: this.config.sessionId
      }
    });

    this.updateConnectionState();
  }

  private handleDisconnect(): void {
    this.state.isConnected = false;
    this.state.lastActivity = new Date();
    this.state.state = this.client.getState();
    this.updateConnectionState();
  }

  private handleMessage(message: any): void {
    this.state.lastActivity = new Date();

    // Handle special messages
    if (message.action === 'connection_established') {
      this.state.connectionId = message.connectionId;
      this.updateConnectionState();
    }

    if (message.action === 'pong') {
      this.state.lastActivity = new Date();
      return;
    }

    // Call registered handlers
    const handlers = this.messageHandlers.get(message.action);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in message handler for action ${message.action}:`, error);
        }
      });
    }
  }

  private handleError(error: any): void {
    console.error('Connection error:', error);
  }

  private handleReconnectFailed(): void {
    this.state.isConnected = false;
    this.state.state = WebSocketState.ERROR;
    this.updateConnectionState();
  }

  private updateConnectionState(): void {
    this.state.state = this.client.getState();
    this.stateHandlers.forEach(handler => {
      try {
        handler(this.getConnectionState());
      } catch (error) {
        console.error('Error in connection state handler:', error);
      }
    });
  }
}