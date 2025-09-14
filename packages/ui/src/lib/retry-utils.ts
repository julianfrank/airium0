export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    retryCondition = (error) => true,
    onRetry,
  } = options;

  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry if this is the last attempt or if retry condition fails
      if (attempt === maxAttempts || !retryCondition(error)) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      );

      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000;

      console.warn(`Operation failed (attempt ${attempt}/${maxAttempts}), retrying in ${jitteredDelay}ms:`, error);
      
      if (onRetry) {
        onRetry(attempt, error);
      }

      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }

  throw new RetryError(
    `Operation failed after ${maxAttempts} attempts`,
    maxAttempts,
    lastError!
  );
}

// Specific retry conditions for common scenarios
export const retryConditions = {
  // Retry on network errors and 5xx status codes
  networkAndServerErrors: (error: any) => {
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      return true;
    }
    
    if (error.response?.status >= 500) {
      return true;
    }
    
    // Retry on timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return true;
    }
    
    return false;
  },

  // Retry on WebSocket connection errors
  websocketErrors: (error: any) => {
    return error.type === 'error' || error.code === 1006; // Abnormal closure
  },

  // Don't retry on authentication errors
  nonAuthErrors: (error: any) => {
    const status = error.response?.status;
    return status !== 401 && status !== 403;
  },
};

// Utility for creating retryable API calls
export function createRetryableApiCall<T extends any[], R>(
  apiCall: (...args: T) => Promise<R>,
  options: RetryOptions = {}
) {
  return (...args: T): Promise<R> => {
    return withRetry(() => apiCall(...args), {
      retryCondition: retryConditions.networkAndServerErrors,
      ...options,
    });
  };
}

// Circuit breaker pattern for preventing cascading failures
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold = 5,
    private readonly recoveryTimeout = 60000, // 1 minute
    private readonly monitoringPeriod = 300000 // 5 minutes
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}