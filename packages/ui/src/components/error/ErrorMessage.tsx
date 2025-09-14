import React from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

export interface ErrorMessageProps {
  error: Error | string;
  title?: string;
  showRetry?: boolean;
  showDetails?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorMessage({
  error,
  title = 'Something went wrong',
  showRetry = true,
  showDetails = false,
  onRetry,
  onDismiss,
  className = '',
}: ErrorMessageProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'object' ? error.stack : undefined;

  const getErrorType = (error: Error | string): string => {
    if (typeof error === 'string') return 'general';
    
    if (error.name === 'NetworkError' || error.message.includes('network')) {
      return 'network';
    }
    if (error.message.includes('timeout')) {
      return 'timeout';
    }
    if (error.message.includes('unauthorized') || error.message.includes('401')) {
      return 'auth';
    }
    if (error.message.includes('forbidden') || error.message.includes('403')) {
      return 'permission';
    }
    return 'general';
  };

  const getErrorIcon = (type: string): string => {
    switch (type) {
      case 'network': return '🌐';
      case 'timeout': return '⏱️';
      case 'auth': return '🔐';
      case 'permission': return '🚫';
      default: return '⚠️';
    }
  };

  const getUserFriendlyMessage = (type: string, originalMessage: string): string => {
    switch (type) {
      case 'network':
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      case 'timeout':
        return 'The request took too long to complete. Please try again.';
      case 'auth':
        return 'Your session has expired. Please log in again.';
      case 'permission':
        return 'You don\'t have permission to perform this action.';
      default:
        return originalMessage || 'An unexpected error occurred. Please try again.';
    }
  };

  const errorType = getErrorType(error);
  const icon = getErrorIcon(errorType);
  const friendlyMessage = getUserFriendlyMessage(errorType, errorMessage);

  return (
    <Card className={`p-4 border-red-200 bg-red-50 ${className}`}>
      <div className="flex items-start space-x-3">
        <span className="text-2xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          <p className="mt-1 text-sm text-red-700">{friendlyMessage}</p>
          
          {showDetails && errorStack && process.env.NODE_ENV === 'development' && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-red-600 hover:text-red-800">
                Technical Details
              </summary>
              <pre className="mt-1 text-xs bg-red-100 p-2 rounded overflow-auto max-h-32">
                {errorStack}
              </pre>
            </details>
          )}
        </div>
        
        <div className="flex-shrink-0 flex space-x-2">
          {showRetry && onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="text-red-600 hover:text-red-800 hover:bg-red-100"
            >
              ✕
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// Specialized error components for common scenarios
export function NetworkErrorMessage({ onRetry, onDismiss }: { onRetry?: () => void; onDismiss?: () => void }) {
  return (
    <ErrorMessage
      error="network"
      title="Connection Problem"
      onRetry={onRetry}
      onDismiss={onDismiss}
    />
  );
}

export function AuthErrorMessage({ onRetry, onDismiss }: { onRetry?: () => void; onDismiss?: () => void }) {
  return (
    <ErrorMessage
      error="auth"
      title="Authentication Required"
      onRetry={onRetry}
      onDismiss={onDismiss}
    />
  );
}

export function PermissionErrorMessage({ onDismiss }: { onDismiss?: () => void }) {
  return (
    <ErrorMessage
      error="permission"
      title="Access Denied"
      showRetry={false}
      onDismiss={onDismiss}
    />
  );
}