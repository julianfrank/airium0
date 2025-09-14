import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary } from '../components/error/ErrorBoundary';
import { useErrorHandler } from '../components/error/useErrorHandler';
import { ErrorMessage } from '../components/error/ErrorMessage';
import { withRetry, retryConditions, CircuitBreaker } from '../lib/retry-utils';

// Mock component that throws an error
function ThrowingComponent({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Working component</div>;
}

// Test component using error handler hook
function TestErrorHandlerComponent() {
  const { error, isError, handleError, clearError, wrapAsync } = useErrorHandler();

  const throwError = () => {
    handleError(new Error('Test handled error'));
  };

  const asyncOperation = wrapAsync(async () => {
    throw new Error('Async error');
  });

  return (
    <div>
      <button onClick={throwError}>Throw Error</button>
      <button onClick={() => asyncOperation()}>Async Error</button>
      {isError && (
        <div>
          <span>Error: {error?.message}</span>
          <button onClick={clearError}>Clear</button>
        </div>
      )}
    </div>
  );
}

describe('Error Handling System', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset console methods
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('ErrorBoundary', () => {
    it('catches and displays errors', () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });

    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Working component')).toBeInTheDocument();
    });

    it('allows retry functionality', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Try Again'));
      
      // After retry, error should be cleared (component will re-render)
      expect(screen.getByText('Working component')).toBeInTheDocument();
    });

    it('stores error reports in localStorage', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorReports = JSON.parse(localStorage.getItem('errorReports') || '[]');
      expect(errorReports).toHaveLength(1);
      expect(errorReports[0]).toMatchObject({
        message: 'Test error',
        timestamp: expect.any(String),
      });
    });
  });

  describe('useErrorHandler', () => {
    it('handles errors correctly', () => {
      render(<TestErrorHandlerComponent />);

      fireEvent.click(screen.getByText('Throw Error'));

      expect(screen.getByText('Error: Test handled error')).toBeInTheDocument();
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('clears errors', () => {
      render(<TestErrorHandlerComponent />);

      fireEvent.click(screen.getByText('Throw Error'));
      expect(screen.getByText('Error: Test handled error')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Clear'));
      expect(screen.queryByText('Error: Test handled error')).not.toBeInTheDocument();
    });

    it('wraps async functions correctly', async () => {
      render(<TestErrorHandlerComponent />);

      fireEvent.click(screen.getByText('Async Error'));

      await waitFor(() => {
        expect(screen.getByText('Error: Async error')).toBeInTheDocument();
      });
    });

    it('stores error reports', () => {
      render(<TestErrorHandlerComponent />);

      fireEvent.click(screen.getByText('Throw Error'));

      const errorReports = JSON.parse(localStorage.getItem('errorReports') || '[]');
      expect(errorReports).toHaveLength(1);
      expect(errorReports[0].message).toBe('Test handled error');
    });
  });

  describe('ErrorMessage', () => {
    it('displays error message correctly', () => {
      const onRetry = vi.fn();
      const onDismiss = vi.fn();

      render(
        <ErrorMessage
          error="Test error message"
          title="Test Error"
          onRetry={onRetry}
          onDismiss={onDismiss}
        />
      );

      expect(screen.getByText('Test Error')).toBeInTheDocument();
      expect(screen.getByText(/Test error message/)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('calls retry handler', () => {
      const onRetry = vi.fn();

      render(
        <ErrorMessage
          error="Test error"
          onRetry={onRetry}
        />
      );

      fireEvent.click(screen.getByText('Retry'));
      expect(onRetry).toHaveBeenCalled();
    });

    it('calls dismiss handler', () => {
      const onDismiss = vi.fn();

      render(
        <ErrorMessage
          error="Test error"
          onDismiss={onDismiss}
        />
      );

      fireEvent.click(screen.getByText('✕'));
      expect(onDismiss).toHaveBeenCalled();
    });

    it('shows appropriate icons for different error types', () => {
      const { rerender } = render(
        <ErrorMessage error={new Error('network error')} />
      );
      expect(screen.getByText('🌐')).toBeInTheDocument();

      rerender(<ErrorMessage error={new Error('timeout error')} />);
      expect(screen.getByText('⏱️')).toBeInTheDocument();

      rerender(<ErrorMessage error={new Error('unauthorized')} />);
      expect(screen.getByText('🔐')).toBeInTheDocument();
    });
  });

  describe('Retry Utils', () => {
    describe('withRetry', () => {
      it('retries failed operations', async () => {
        let attempts = 0;
        const operation = vi.fn().mockImplementation(() => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Temporary failure');
          }
          return 'success';
        });

        const result = await withRetry(operation, {
          maxAttempts: 3,
          baseDelay: 10, // Short delay for testing
        });

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(3);
      });

      it('throws RetryError after max attempts', async () => {
        const operation = vi.fn().mockRejectedValue(new Error('Persistent failure'));

        await expect(
          withRetry(operation, {
            maxAttempts: 2,
            baseDelay: 10,
          })
        ).rejects.toThrow('Operation failed after 2 attempts');

        expect(operation).toHaveBeenCalledTimes(2);
      });

      it('respects retry conditions', async () => {
        const operation = vi.fn().mockRejectedValue({ response: { status: 401 } });

        await expect(
          withRetry(operation, {
            maxAttempts: 3,
            baseDelay: 10,
            retryCondition: retryConditions.nonAuthErrors,
          })
        ).rejects.toThrow();

        // Should not retry on auth errors
        expect(operation).toHaveBeenCalledTimes(1);
      });

      it('calls onRetry callback', async () => {
        const onRetry = vi.fn();
        const operation = vi.fn()
          .mockRejectedValueOnce(new Error('First failure'))
          .mockResolvedValueOnce('success');

        await withRetry(operation, {
          maxAttempts: 2,
          baseDelay: 10,
          onRetry,
        });

        expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
      });
    });

    describe('CircuitBreaker', () => {
      it('opens circuit after failure threshold', async () => {
        const circuitBreaker = new CircuitBreaker(2, 1000); // 2 failures, 1s recovery
        const operation = vi.fn().mockRejectedValue(new Error('Service down'));

        // First two failures should work
        await expect(circuitBreaker.execute(operation)).rejects.toThrow('Service down');
        await expect(circuitBreaker.execute(operation)).rejects.toThrow('Service down');

        // Third attempt should be blocked by circuit breaker
        await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');

        expect(operation).toHaveBeenCalledTimes(2);
        expect(circuitBreaker.getState().state).toBe('OPEN');
      });

      it('closes circuit after successful operation', async () => {
        const circuitBreaker = new CircuitBreaker(1, 100); // 1 failure, 100ms recovery
        const operation = vi.fn()
          .mockRejectedValueOnce(new Error('Failure'))
          .mockResolvedValueOnce('Success');

        // Cause failure to open circuit
        await expect(circuitBreaker.execute(operation)).rejects.toThrow('Failure');
        expect(circuitBreaker.getState().state).toBe('OPEN');

        // Wait for recovery timeout
        await new Promise(resolve => setTimeout(resolve, 150));

        // Next call should succeed and close circuit
        const result = await circuitBreaker.execute(operation);
        expect(result).toBe('Success');
        expect(circuitBreaker.getState().state).toBe('CLOSED');
      });
    });

    describe('retryConditions', () => {
      it('networkAndServerErrors identifies retryable errors', () => {
        expect(retryConditions.networkAndServerErrors({ name: 'NetworkError' })).toBe(true);
        expect(retryConditions.networkAndServerErrors({ response: { status: 500 } })).toBe(true);
        expect(retryConditions.networkAndServerErrors({ response: { status: 503 } })).toBe(true);
        expect(retryConditions.networkAndServerErrors({ message: 'timeout' })).toBe(true);
        
        expect(retryConditions.networkAndServerErrors({ response: { status: 400 } })).toBe(false);
        expect(retryConditions.networkAndServerErrors({ response: { status: 404 } })).toBe(false);
      });

      it('nonAuthErrors excludes auth errors', () => {
        expect(retryConditions.nonAuthErrors({ response: { status: 401 } })).toBe(false);
        expect(retryConditions.nonAuthErrors({ response: { status: 403 } })).toBe(false);
        expect(retryConditions.nonAuthErrors({ response: { status: 500 } })).toBe(true);
        expect(retryConditions.nonAuthErrors({ response: { status: 404 } })).toBe(true);
      });

      it('websocketErrors identifies WebSocket errors', () => {
        expect(retryConditions.websocketErrors({ type: 'error' })).toBe(true);
        expect(retryConditions.websocketErrors({ code: 1006 })).toBe(true);
        expect(retryConditions.websocketErrors({ type: 'message' })).toBe(false);
      });
    });
  });
});