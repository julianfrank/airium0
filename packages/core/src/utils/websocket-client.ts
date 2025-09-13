/**
 * WebSocket Client Utility
 * Provides a typed WebSocket client for connecting to the AIrium WebSocket API
 * Requirements: 1.1, 6.2
 */

import { WebSocketMessage } from '../services/connection-manager';

export interface WebSocketClientOptions {
  url: string;
  userId?: string;
  sessionId?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  pingInterval?: number;
}

export interface WebSocketClientEvents {
  onOpen?: (event: Event) => void;
  onClose?: (event: Event) => void;
  onError?: (event: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onConnectionEstablished?: (data: any) => void;
  onVoiceSessionStarted?: (data: any) => void;
  onVoiceSessionEnded?: (data: any) => void;
  onVoiceDataReceived?: (data: any) => void;
  onTextMessageReceived?: (data: any) => void;
  onAIResponse?: (data: any) => void;
  onMessageError?: (data: any) => void;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private options: Required<WebSocketClientOptions>;
  private events: WebSocketClientEvents;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private currentReconnectAttempts = 0;
  private isConnecting = false;
  private isManualClose = false;

  constructor(options: WebSocketClientOptions, events: WebSocketClientEvents = {}) {
    this.options = {
      url: options.url,
      userId: options.userId || 'anonymous',
      sessionId: options.sessionId || `session-${Date.now()}`,
      reconnectAttempts: options.reconnectAttempts || 5,
      reconnectDelay: options.reconnectDelay || 1000,
      pingInterval: options.pingInterval || 30000,
    };
    this.events = events;
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;
      this.isManualClose = false;

      // Build WebSocket URL with query parameters
      const url = new URL(this.options.url);
      url.searchParams.set('userId', this.options.userId);
      url.searchParams.set('sessionId', this.options.sessionId);

      this.ws = new WebSocket(url.toString());

      this.ws.onopen = (event) => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.currentReconnectAttempts = 0;
        this.startPing();
        this.events.onOpen?.(event);
        resolve();
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.stopPing();
        this.events.onClose?.(event);

        // Attempt reconnection if not manually closed
        if (!this.isManualClose && this.currentReconnectAttempts < this.options.reconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        this.isConnecting = false;
        this.events.onError?.(event);
        reject(new Error('WebSocket connection failed'));
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.isManualClose = true;
    this.stopPing();
    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
  }

  /**
   * Send a message to the server
   */
  send(message: WebSocketMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    message.timestamp = message.timestamp || new Date().toISOString();
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send a text message
   */
  sendTextMessage(content: string, sessionId?: string): void {
    this.send({
      type: 'text_message',
      data: {
        content,
        sessionId: sessionId || this.options.sessionId,
      },
    });
  }

  /**
   * Start a voice session
   */
  startVoiceSession(audioFormat: string = 'webm', sessionId?: string): void {
    this.send({
      type: 'voice_start',
      data: {
        audioFormat,
        sessionId: sessionId || `voice-${Date.now()}`,
      },
    });
  }

  /**
   * Send voice data
   */
  sendVoiceData(audioData: string, sessionId: string): void {
    this.send({
      type: 'voice_data',
      data: {
        audioData,
        sessionId,
      },
    });
  }

  /**
   * End a voice session
   */
  endVoiceSession(sessionId: string): void {
    this.send({
      type: 'voice_end',
      data: {
        sessionId,
      },
    });
  }

  /**
   * Send a ping message
   */
  ping(): void {
    this.send({
      type: 'ping',
    });
  }

  /**
   * Get connection status
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: WebSocketMessage): void {
    console.log('Received WebSocket message:', message);

    // Call general message handler
    this.events.onMessage?.(message);

    // Call specific handlers based on message type
    switch (message.type) {
      case 'connection_established':
        this.events.onConnectionEstablished?.(message.data);
        break;
      case 'voice_session_started':
        this.events.onVoiceSessionStarted?.(message.data);
        break;
      case 'voice_session_ended':
        this.events.onVoiceSessionEnded?.(message.data);
        break;
      case 'voice_data_received':
        this.events.onVoiceDataReceived?.(message.data);
        break;
      case 'text_message_received':
        this.events.onTextMessageReceived?.(message.data);
        break;
      case 'ai_response':
        this.events.onAIResponse?.(message.data);
        break;
      case 'error':
        this.events.onMessageError?.(message.data);
        break;
      case 'pong':
        // Handle pong response
        break;
      default:
        console.log(`Unhandled message type: ${message.type}`);
    }
  }

  /**
   * Start periodic ping
   */
  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.isConnected) {
        this.ping();
      }
    }, this.options.pingInterval);
  }

  /**
   * Stop periodic ping
   */
  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    
    const delay = this.options.reconnectDelay * Math.pow(2, this.currentReconnectAttempts);
    console.log(`Scheduling reconnect attempt ${this.currentReconnectAttempts + 1} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.currentReconnectAttempts++;
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}