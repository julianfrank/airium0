import { useCallback, useState } from 'react';

export interface ErrorState {
  error: Error | null;
  isError: boolean;
  errorId: string | null;
}

export interface ErrorHandlerOptions {
  onError?: (error: Error) => void;
  reportToService?: boolean;
  showToast?: boolean;
}

export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false,
    errorId: null,
  });

  const reportError = useCallback((error: Error, context?: Record<string, any>) => {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const errorReport = {
      id: errorId,
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Log to console for development
    console.error('Error Handler:', errorReport);

    // Store locally for offline reporting
    try {
      const existingErrors = JSON.parse(localStorage.getItem('errorReports') || '[]');
      existingErrors.push(errorReport);
      localStorage.setItem('errorReports', JSON.stringify(existingErrors.slice(-20)));
    } catch (e) {
      console.error('Failed to store error report:', e);
    }

    // Report to monitoring service if enabled
    if (options.reportToService !== false) {
      // In a real implementation, this would send to CloudWatch or another service
      // For now, we'll just log it
      console.log('Would report to monitoring service:', errorReport);
    }

    return errorId;
  }, [options.reportToService]);

  const handleError = useCallback((error: Error, context?: Record<string, any>) => {
    const errorId = reportError(error, context);
    
    setErrorState({
      error,
      isError: true,
      errorId,
    });

    // Call custom error handler if provided
    if (options.onError) {
      options.onError(error);
    }

    return errorId;
  }, [reportError, options.onError]);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isError: false,
      errorId: null,
    });
  }, []);

  const wrapAsync = useCallback(<T extends any[], R>(
    asyncFn: (...args: T) => Promise<R>
  ) => {
    return async (...args: T): Promise<R | null> => {
      try {
        return await asyncFn(...args);
      } catch (error) {
        handleError(error as Error, { functionName: asyncFn.name, args });
        return null;
      }
    };
  }, [handleError]);

  return {
    ...errorState,
    handleError,
    clearError,
    reportError,
    wrapAsync,
  };
}