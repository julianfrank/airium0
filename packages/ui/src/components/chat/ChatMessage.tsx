import React from 'react';
import { User, Bot, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ChatMessageProps } from './types';

export function ChatMessage({ message, className = "" }: ChatMessageProps) {
  const { isUser, content, timestamp, isLoading, error, type } = message;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>AI is thinking...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Error: {error}</span>
        </div>
      );
    }

    // Handle different message types
    switch (type) {
      case 'VOICE':
        return (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Voice message transcription:</div>
            <div className="whitespace-pre-wrap break-words">{content}</div>
          </div>
        );
      case 'MEDIA':
        return (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Media content:</div>
            <div className="whitespace-pre-wrap break-words">{content}</div>
          </div>
        );
      default:
        return <div className="whitespace-pre-wrap break-words">{content}</div>;
    }
  };

  return (
    <div className={cn(
      "flex gap-3 p-4 rounded-lg",
      isUser 
        ? "bg-primary/10 ml-8" 
        : "bg-muted mr-8",
      className
    )}>
      <div className="shrink-0">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <User className="h-4 w-4 text-primary-foreground" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <Bot className="h-4 w-4 text-secondary-foreground" />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">
            {isUser ? 'You' : 'AI Assistant'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(timestamp)}
          </span>
          {type !== 'TEXT' && (
            <span className="text-xs px-2 py-1 bg-secondary rounded-full">
              {type.toLowerCase()}
            </span>
          )}
        </div>
        
        <div className="text-sm">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}