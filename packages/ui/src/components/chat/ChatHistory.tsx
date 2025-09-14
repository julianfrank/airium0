import React, { useEffect, useRef } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { cn } from '../../lib/utils';
import type { ChatHistoryProps } from './types';

export function ChatHistory({ 
  messages, 
  isLoading = false, 
  className = "" 
}: ChatHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        Start a conversation
      </h3>
      <p className="text-muted-foreground max-w-sm">
        Type a message below to begin chatting with the AI assistant. 
        You can ask questions, request help, or have a natural conversation.
      </p>
    </div>
  );

  const renderLoadingIndicator = () => (
    <div className="flex items-center justify-center p-4">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <span className="ml-2 text-muted-foreground">Loading chat history...</span>
    </div>
  );

  return (
    <div className={cn(
      "flex-1 overflow-hidden flex flex-col",
      className
    )}>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto scroll-smooth"
      >
        {isLoading && messages.length === 0 ? (
          renderLoadingIndicator()
        ) : messages.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="space-y-2 p-4">
            {messages.map((message) => (
              <ChatMessage 
                key={message.id} 
                message={message}
              />
            ))}
          </div>
        )}
        
        {/* Invisible element to scroll to */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}