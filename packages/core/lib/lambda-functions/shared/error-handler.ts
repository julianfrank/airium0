import { Logger } from './logger';

export interface ErrorResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  operation?: string;
  [key: string]: any;
}

export class LambdaError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public errorCode?: string,
    public context?: ErrorContext
  ) {
    super(message);
    this.name = 'LambdaError';
  }
}

export class ValidationError extends LambdaError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 400, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends LambdaError {
  constructor(message: string = 'Authentication required', context?: ErrorContext) {
    super(message, 401, 'AUTHENTICATION_ERROR', context);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends LambdaError {
  constructor(message: string = 'Insufficient permissions', context?: ErrorContext) {
    super(message, 403, 'AUTHORIZATION_ERROR', context);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends LambdaError {
  constructor(message: string = 'Resource not found', context?: ErrorContext) {
    super(message, 404, 'NOT_FOUND_ERROR', context);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends LambdaError {
  constructor(message: string = 'Resource conflict', context?: ErrorContext) {
    super(message, 409, 'CONFLICT_ERROR', context);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends LambdaError {
  constructor(message: string = 'Rate limit exceeded', context?: ErrorContext) {
    super(message, 429, 'RATE_LIMIT_ERROR', context);
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends LambdaError {
  constructor(message: string, service: string, context?: ErrorContext) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', { ...context, service });
    this.name = 'ExternalServiceError';
  }
}

export class TimeoutError extends LambdaError {
  constructor(message: string = 'Operation timeout', context?: ErrorContext) {
    super(message, 504, 'TIMEOUT_ERROR', context);
    this.name = 'TimeoutError';
  }
}

export function createErrorResponse(error: Error, logger?: Logger): ErrorResponse {
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'Internal server error';
  let context: ErrorContext = {};

  if (error instanceof LambdaError) {
    statusCode = error.statusCode;
    errorCode = error.errorCode || 'LAMBDA_ERROR';
    message = error.message;
    context = error.context || {};
  } else {
    // Handle known error types
    if (error.name === 'ValidationError') {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      message = error.message;
    } else if (error.name === 'UnauthorizedError' || error.message.includes('unauthorized')) {
      statusCode = 401;
      errorCode = 'AUTHENTICATION_ERROR';
      message = 'Authentication required';
    } else if (error.name === 'ForbiddenError' || error.message.includes('forbidden')) {
      statusCode = 403;
      errorCode = 'AUTHORIZATION_ERROR';
      message = 'Insufficient permissions';
    } else if (error.name === 'NotFoundError' || error.message.includes('not found')) {
      statusCode = 404;
      errorCode = 'NOT_FOUND_ERROR';
      message = 'Resource not found';
    } else if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      statusCode = 504;
      errorCode = 'TIMEOUT_ERROR';
      message = 'Operation timeout';
    }
  }

  // Log the error
  if (logger) {
    logger.error('Lambda function error', context, error);
  } else {
    console.error('Lambda function error:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      statusCode,
      errorCode,
      context,
    });
  }

  const responseBody = {
    error: {
      code: errorCode,
      message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        originalMessage: error.message 
      }),
    },
  };

  return {
    statusCode,
    body: JSON.stringify(responseBody),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    },
  };
}

// Utility function to wrap Lambda handlers with error handling
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  logger?: Logger
) {
  return async (...args: T): Promise<R | ErrorResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return createErrorResponse(error as Error, logger);
    }
  };
}

// Utility for input validation
export function validateRequired(obj: any, fields: string[], context?: ErrorContext): void {
  const missing = fields.filter(field => !obj || obj[field] === undefined || obj[field] === null);
  
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      context
    );
  }
}

// Utility for type validation
export function validateType(value: any, expectedType: string, fieldName: string, context?: ErrorContext): void {
  const actualType = typeof value;
  
  if (actualType !== expectedType) {
    throw new ValidationError(
      `Field '${fieldName}' must be of type ${expectedType}, got ${actualType}`,
      context
    );
  }
}

// Utility for array validation
export function validateArray(value: any, fieldName: string, minLength?: number, maxLength?: number, context?: ErrorContext): void {
  if (!Array.isArray(value)) {
    throw new ValidationError(
      `Field '${fieldName}' must be an array`,
      context
    );
  }
  
  if (minLength !== undefined && value.length < minLength) {
    throw new ValidationError(
      `Field '${fieldName}' must have at least ${minLength} items`,
      context
    );
  }
  
  if (maxLength !== undefined && value.length > maxLength) {
    throw new ValidationError(
      `Field '${fieldName}' must have at most ${maxLength} items`,
      context
    );
  }
}

// Utility for string validation
export function validateString(value: any, fieldName: string, minLength?: number, maxLength?: number, pattern?: RegExp, context?: ErrorContext): void {
  validateType(value, 'string', fieldName, context);
  
  if (minLength !== undefined && value.length < minLength) {
    throw new ValidationError(
      `Field '${fieldName}' must be at least ${minLength} characters long`,
      context
    );
  }
  
  if (maxLength !== undefined && value.length > maxLength) {
    throw new ValidationError(
      `Field '${fieldName}' must be at most ${maxLength} characters long`,
      context
    );
  }
  
  if (pattern && !pattern.test(value)) {
    throw new ValidationError(
      `Field '${fieldName}' does not match required pattern`,
      context
    );
  }
}