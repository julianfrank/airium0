import React, { useEffect, useCallback } from 'react';
import { useChatSubscription } from '../../lib/use-appsync-subscriptions';
import type { AIResponseHandlerProps, Message } from './types';
import type { ChatEvent } from '@airium/shared';

export function AIResponseHandler({ 
  userId, 
  onResponse, 
  onError 
}: AIResponseHandlerProps) {
  const { data: chatEvent, error: subscriptionError } = useChatSubscription(userId);

  const handleChatEvent = useCallback((event: ChatEvent) => {
    try {
      const { payload } = event;
      const { message, type } = payload;

      // Convert ChatMessage to our Message type
      const processedMessage: Message = {
        ...message,
        isUser: type === 'user_message',
        isLoading: false
      };

      // Only handle AI responses and system messages
      if (type === 'ai_response' || type === 'system_message') {
        onResponse(processedMessage);
      }
    } catch (error) {
      console.error('Error processing chat event:', error);
      onError('Failed to process AI response');
    }
  }, [onResponse, onError]);

  // Handle subscription errors
  useEffect(() => {
    if (subscriptionError) {
      console.error('Chat subscription error:', subscriptionError);
      onError('Lost connection to AI service. Please refresh the page.');
    }
  }, [subscriptionError, onError]);

  // Handle incoming chat events
  useEffect(() => {
    if (chatEvent) {
      handleChatEvent(chatEvent);
    }
  }, [chatEvent, handleChatEvent]);

  // This component doesn't render anything visible
  return null;
}