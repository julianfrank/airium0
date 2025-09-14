export interface LogContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  connectionId?: string;
  operation?: string;
  [key: string]: any;
}

export interface LogEntry {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  context?: LogContext;
  error?: Error;
  timestamp: string;
  service: string;
}

export class Logger {
  private service: string;
  private defaultContext: LogContext;

  constructor(service: string, defaultContext: LogContext = {}) {
    this.service = service;
    this.defaultContext = defaultContext;
  }

  private log(level: LogEntry['level'], message: string, context?: LogContext, error?: Error) {
    const logEntry: LogEntry = {
      level,
      message,
      context: { ...this.defaultContext, ...context },
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } as any : undefined,
      timestamp: new Date().toISOString(),
      service: this.service,
    };

    // Use console methods that CloudWatch can capture
    switch (level) {
      case 'DEBUG':
        console.debug(JSON.stringify(logEntry));
        break;
      case 'INFO':
        console.info(JSON.stringify(logEntry));
        break;
      case 'WARN':
        console.warn(JSON.stringify(logEntry));
        break;
      case 'ERROR':
        console.error(JSON.stringify(logEntry));
        break;
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('DEBUG', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('INFO', message, context);
  }

  warn(message: string, context?: LogContext, error?: Error) {
    this.log('WARN', message, context, error);
  }

  error(message: string, context?: LogContext, error?: Error) {
    this.log('ERROR', message, context, error);
  }

  // Convenience method for logging function entry
  logFunctionEntry(functionName: string, event: any, context?: LogContext) {
    this.info(`${functionName} invoked`, {
      ...context,
      eventType: typeof event,
      eventKeys: Object.keys(event || {}),
    });
  }

  // Convenience method for logging function exit
  logFunctionExit(functionName: string, result: any, context?: LogContext) {
    this.info(`${functionName} completed`, {
      ...context,
      resultType: typeof result,
      success: true,
    });
  }

  // Convenience method for logging function errors
  logFunctionError(functionName: string, error: Error, context?: LogContext) {
    this.error(`${functionName} failed`, {
      ...context,
      success: false,
    }, error);
  }

  // Create a child logger with additional context
  child(additionalContext: LogContext): Logger {
    return new Logger(this.service, { ...this.defaultContext, ...additionalContext });
  }
}

// Utility function to create a logger for a Lambda function
export function createLambdaLogger(serviceName: string, event?: any): Logger {
  const context: LogContext = {};
  
  // Extract common context from Lambda event
  if (event) {
    if (event.requestContext?.requestId) {
      context.requestId = event.requestContext.requestId;
    }
    if (event.requestContext?.connectionId) {
      context.connectionId = event.requestContext.connectionId;
    }
    if (event.pathParameters?.userId) {
      context.userId = event.pathParameters.userId;
    }
    if (event.body) {
      try {
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        if (body.userId) context.userId = body.userId;
        if (body.sessionId) context.sessionId = body.sessionId;
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }

  return new Logger(serviceName, context);
}

// Utility function to wrap Lambda handlers with logging
export function withLogging<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  serviceName: string
) {
  return async (...args: T): Promise<R> => {
    const [event] = args;
    const logger = createLambdaLogger(serviceName, event);
    
    logger.logFunctionEntry(handler.name || serviceName, event);
    
    try {
      const result = await handler(...args);
      logger.logFunctionExit(handler.name || serviceName, result);
      return result;
    } catch (error) {
      logger.logFunctionError(handler.name || serviceName, error as Error);
      throw error;
    }
  };
}

// Utility for measuring execution time
export function withTiming<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  operationName: string,
  logger: Logger
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    
    try {
      const result = await operation(...args);
      const duration = Date.now() - startTime;
      
      logger.info(`${operationName} completed`, {
        duration,
        success: true,
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`${operationName} failed`, {
        duration,
        success: false,
      }, error as Error);
      
      throw error;
    }
  };
}