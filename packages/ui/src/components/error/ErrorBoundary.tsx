import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Report error to monitoring service
    this.reportError(error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // Send error to CloudWatch or monitoring service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // In a real implementation, this would send to CloudWatch
    console.error('Error Report:', errorReport);
    
    // Store in localStorage for offline reporting
    try {
      const existingErrors = JSON.parse(localStorage.getItem('errorReports') || '[]');
      existingErrors.push(errorReport);
      localStorage.setItem('errorReports', JSON.stringify(existingErrors.slice(-10))); // Keep last 10 errors
    } catch (e) {
      console.error('Failed to store error report:', e);
    }
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="p-6 m-4 border-red-200 bg-red-50">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              Something went wrong
            </h2>
            <p className="text-red-600 mb-4">
              We encountered an unexpected error. Please try again or contact support if the problem persists.
            </p>
            <div className="space-x-2">
              <Button 
                onClick={this.handleRetry}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Try Again
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-red-600 hover:bg-red-700"
              >
                Reload Page
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-red-600">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}