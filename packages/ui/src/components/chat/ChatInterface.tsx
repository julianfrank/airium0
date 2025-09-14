import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { ChatHistory } from './ChatHistory';
import { ChatInput } from './ChatInput';
import { AIResponseHandler } from './AIResponseHandler';
import { getChatService } from './ChatService';
import { useWebSocket } from '../../lib/use-websocket';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import type { ChatInterfaceProps, ChatState, Message } from './types';

export function ChatInterface({ 
  userId, 
  className = "",
  onMessage,
  onError,
  maxMessages = 100
}: ChatInterfaceProps) {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    isConnected: false,
    error: null,
    sessionId: null
  });

  const chatService = useRef(getChatService());
  const { wsClient, connectionState } = useWebSocket();

  // Update connection state
  useEffect(() => {
    setChatState(prev => ({
      ...prev,
      isConnected: connectionState === 'CONNECTED'
    }));
  }, [connectionState]);

  // Update chat service with WebSocket client
  useEffect(() => {
    if (wsClient) {
      chatService.current = getChatService(wsClient);
    }
  }, [wsClient]);

  const addMessage = useCallback((message: Message) => {
    setChatState(prev => {
      const newMessages = [...prev.messages, message];
      
      // Limit messages to maxMessages
      if (newMessages.length > maxMessages) {
        newMessages.splice(0, newMessages.length - maxMessages);
      }
      
      return {
        ...prev,
        messages: newMessages
      };
    });
    
    onMessage?.(message);
  }, [maxMessages, onMessage]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!userId || !content.trim()) {
      return;
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    // Add user message immediately
    const userMessage: Message = {
      id: messageId,
      type: 'TEXT',
      content: content.trim(),
      timestamp,
      isUser: true,
      isLoading: false
    };

    addMessage(userMessage);

    // Add loading message for AI response
    const loadingMessageId = `loading_${Date.now()}`;
    const loadingMessage: Message = {
      id: loadingMessageId,
      type: 'TEXT',
      content: '',
      timestamp: new Date().toISOString(),
      isUser: false,
      isLoading: true
    };

    addMessage(loadingMessage);

    try {
      await chatService.current.sendMessage(content.trim(), userId);
    } catch (error) {
      // Remove loading message and add error message
      setChatState(prev => ({
        ...prev,
        messages: prev.messages.filter(msg => msg.id !== loadingMessageId)
      }));

      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        type: 'TEXT',
        content: 'Failed to send message',
        timestamp: new Date().toISOString(),
        isUser: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      addMessage(errorMessage);
      
      const errorText = error instanceof Error ? error.message : 'Failed to send message';
      setChatState(prev => ({ ...prev, error: errorText }));
      onError?.(errorText);
    }
  }, [userId, addMessage, onError]);

  const handleAIResponse = useCallback((message: Message) => {
    // Remove any loading messages
    setChatState(prev => ({
      ...prev,
      messages: prev.messages.filter(msg => !msg.isLoading)
    }));

    // Add the AI response
    addMessage(message);
  }, [addMessage]);

  const handleError = useCallback((error: string) => {
    // Remove any loading messages
    setChatState(prev => ({
      ...prev,
      messages: prev.messages.filter(msg => !msg.isLoading),
      error
    }));
    
    onError?.(error);
  }, [onError]);

  const handleClearChat = useCallback(async () => {
    try {
      await chatService.current.clearHistory(userId);
      setChatState(prev => ({
        ...prev,
        messages: [],
        error: null
      }));
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'Failed to clear chat';
      setChatState(prev => ({ ...prev, error: errorText }));
      onError?.(errorText);
    }
  }, [userId, onError]);

  const handleRetry = useCallback(() => {
    setChatState(prev => ({ ...prev, error: null }));
  }, []);

  return (
    <div className={cn(
      "flex flex-col h-full bg-background border rounded-lg overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">AI Chat</h2>
          <div className={cn(
            "w-2 h-2 rounded-full",
            chatState.isConnected ? "bg-green-500" : "bg-red-500"
          )} />
          <span className="text-sm text-muted-foreground">
            {chatState.isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {chatState.messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearChat}
              className="text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Clear chat</span>
            </Button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {chatState.error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border-b border-destructive/20">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive flex-1">{chatState.error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRetry}
            className="text-destructive hover:text-destructive"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="sr-only">Retry</span>
          </Button>
        </div>
      )}

      {/* Chat History */}
      <ChatHistory 
        messages={chatState.messages}
        isLoading={chatState.isLoading}
        className="flex-1"
      />

      {/* Chat Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={!chatState.isConnected || chatState.isLoading}
        placeholder={
          chatState.isConnected 
            ? "Type your message..." 
            : "Connecting to chat service..."
        }
      />

      {/* AI Response Handler */}
      <AIResponseHandler
        userId={userId}
        onResponse={handleAIResponse}
        onError={handleError}
      />
    </div>
  );
}