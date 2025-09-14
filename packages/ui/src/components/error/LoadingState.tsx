import React from 'react';
import { Card } from '../ui/card';

export interface LoadingStateProps {
  message?: string;
  showSpinner?: boolean;
  className?: string;
}

export function LoadingState({
  message = 'Loading...',
  showSpinner = true,
  className = '',
}: LoadingStateProps) {
  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-center space-x-3">
        {showSpinner && (
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        )}
        <span className="text-gray-600">{message}</span>
      </div>
    </Card>
  );
}

export function RetryingState({ attempt, maxAttempts }: { attempt: number; maxAttempts: number }) {
  return (
    <LoadingState
      message={`Retrying... (${attempt}/${maxAttempts})`}
      className="border-yellow-200 bg-yellow-50"
    />
  );
}

export function ReconnectingState({ attempt }: { attempt: number }) {
  return (
    <LoadingState
      message={`Reconnecting... (attempt ${attempt})`}
      className="border-blue-200 bg-blue-50"
    />
  );
}