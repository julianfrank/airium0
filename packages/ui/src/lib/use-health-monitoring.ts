import { useState, useEffect, useCallback } from 'react';
import { appSyncClient } from './appsync-client';
import { WebSocketClient } from './websocket-client';

export interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    websocket: ServiceHealth;
    appsync: ServiceHealth;
    authentication: ServiceHealth;
    storage: ServiceHealth;
  };
  lastUpdated: string;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  errorRate?: number;
  lastError?: string;
  lastErrorTime?: string;
  uptime?: number;
}

export interface HealthMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errors: ErrorMetric[];
}

export interface ErrorMetric {
  timestamp: string;
  service: string;
  error: string;
  count: number;
}

export function useHealthMonitoring() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    overall: 'healthy',
    services: {
      websocket: { status: 'healthy' },
      appsync: { status: 'healthy' },
      authentication: { status: 'healthy' },
      storage: { status: 'healthy' },
    },
    lastUpdated: new Date().toISOString(),
  });

  const [metrics, setMetrics] = useState<HealthMetrics>({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    errors: [],
  });

  const [isMonitoring, setIsMonitoring] = useState(false);

  // Check WebSocket health
  const checkWebSocketHealth = useCallback(async (): Promise<ServiceHealth> => {
    try {
      const startTime = Date.now();
      
      // Get stored error reports
      const errorReports = JSON.parse(localStorage.getItem('errorReports') || '[]');
      const wsErrors = errorReports.filter((error: any) => 
        error.type === 'websocket_connection_error' || error.type === 'websocket_send_error'
      );
      
      const recentErrors = wsErrors.filter((error: any) => 
        Date.now() - new Date(error.timestamp).getTime() < 300000 // Last 5 minutes
      );

      const errorRate = recentErrors.length / Math.max(1, wsErrors.length);
      const responseTime = Date.now() - startTime;

      let status: ServiceHealth['status'] = 'healthy';
      if (errorRate > 0.5) {
        status = 'unhealthy';
      } else if (errorRate > 0.2) {
        status = 'degraded';
      }

      return {
        status,
        responseTime,
        errorRate,
        lastError: recentErrors[0]?.message,
        lastErrorTime: recentErrors[0]?.timestamp,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastError: (error as Error).message,
        lastErrorTime: new Date().toISOString(),
      };
    }
  }, []);

  // Check AppSync health
  const checkAppSyncHealth = useCallback(async (): Promise<ServiceHealth> => {
    try {
      const startTime = Date.now();
      const health = appSyncClient.getHealth();
      const responseTime = Date.now() - startTime;

      let status: ServiceHealth['status'] = 'healthy';
      if (health.errorCount > 10) {
        status = 'unhealthy';
      } else if (health.errorCount > 5) {
        status = 'degraded';
      }

      // Get stored AppSync errors
      const appSyncErrors = JSON.parse(localStorage.getItem('appSyncErrors') || '[]');
      const recentErrors = appSyncErrors.filter((error: any) => 
        Date.now() - new Date(error.timestamp).getTime() < 300000 // Last 5 minutes
      );

      return {
        status,
        responseTime,
        errorRate: recentErrors.length / Math.max(1, appSyncErrors.length),
        lastError: recentErrors[0]?.message,
        lastErrorTime: recentErrors[0]?.timestamp,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastError: (error as Error).message,
        lastErrorTime: new Date().toISOString(),
      };
    }
  }, []);

  // Check authentication health
  const checkAuthHealth = useCallback(async (): Promise<ServiceHealth> => {
    try {
      const startTime = Date.now();
      
      // Simple auth check - try to get current user
      const { getCurrentUser } = await import('aws-amplify/auth');
      await getCurrentUser();
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        errorRate: 0,
      };
    } catch (error) {
      return {
        status: 'degraded', // Auth errors might be expected (user not logged in)
        lastError: (error as Error).message,
        lastErrorTime: new Date().toISOString(),
      };
    }
  }, []);

  // Check storage health
  const checkStorageHealth = useCallback(async (): Promise<ServiceHealth> => {
    try {
      const startTime = Date.now();
      
      // Test localStorage access
      const testKey = 'health-check-test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        errorRate: 0,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastError: (error as Error).message,
        lastErrorTime: new Date().toISOString(),
      };
    }
  }, []);

  // Perform comprehensive health check
  const performHealthCheck = useCallback(async () => {
    try {
      const [websocket, appsync, authentication, storage] = await Promise.all([
        checkWebSocketHealth(),
        checkAppSyncHealth(),
        checkAuthHealth(),
        checkStorageHealth(),
      ]);

      const services = { websocket, appsync, authentication, storage };
      
      // Determine overall health
      const serviceStatuses = Object.values(services).map(s => s.status);
      let overall: HealthStatus['overall'] = 'healthy';
      
      if (serviceStatuses.includes('unhealthy')) {
        overall = 'unhealthy';
      } else if (serviceStatuses.includes('degraded')) {
        overall = 'degraded';
      }

      const newHealthStatus: HealthStatus = {
        overall,
        services,
        lastUpdated: new Date().toISOString(),
      };

      setHealthStatus(newHealthStatus);

      // Update metrics
      const errorReports = JSON.parse(localStorage.getItem('errorReports') || '[]');
      const appSyncErrors = JSON.parse(localStorage.getItem('appSyncErrors') || '[]');
      
      const allErrors = [...errorReports, ...appSyncErrors];
      const recentErrors = allErrors.filter((error: any) => 
        Date.now() - new Date(error.timestamp).getTime() < 3600000 // Last hour
      );

      const errorsByService = recentErrors.reduce((acc: Record<string, number>, error: any) => {
        const service = error.type?.includes('websocket') ? 'websocket' : 
                      error.type?.includes('appsync') ? 'appsync' : 'unknown';
        acc[service] = (acc[service] || 0) + 1;
        return acc;
      }, {});

      const errorMetrics: ErrorMetric[] = Object.entries(errorsByService).map(([service, count]) => ({
        timestamp: new Date().toISOString(),
        service,
        error: 'Various errors',
        count: count as number,
      }));

      setMetrics(prev => ({
        totalRequests: prev.totalRequests + 1,
        successfulRequests: overall === 'healthy' ? prev.successfulRequests + 1 : prev.successfulRequests,
        failedRequests: overall === 'unhealthy' ? prev.failedRequests + 1 : prev.failedRequests,
        averageResponseTime: Math.round(
          Object.values(services)
            .filter(s => s.responseTime)
            .reduce((sum, s) => sum + (s.responseTime || 0), 0) / 
          Object.values(services).filter(s => s.responseTime).length
        ),
        errors: errorMetrics,
      }));

    } catch (error) {
      console.error('Health check failed:', error);
      setHealthStatus(prev => ({
        ...prev,
        overall: 'unhealthy',
        lastUpdated: new Date().toISOString(),
      }));
    }
  }, [checkWebSocketHealth, checkAppSyncHealth, checkAuthHealth, checkStorageHealth]);

  // Start/stop monitoring
  const startMonitoring = useCallback((interval: number = 30000) => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    
    // Perform initial check
    performHealthCheck();
    
    // Set up periodic checks
    const intervalId = setInterval(performHealthCheck, interval);
    
    return () => {
      clearInterval(intervalId);
      setIsMonitoring(false);
    };
  }, [isMonitoring, performHealthCheck]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  // Get error reports
  const getErrorReports = useCallback(() => {
    const errorReports = JSON.parse(localStorage.getItem('errorReports') || '[]');
    const appSyncErrors = JSON.parse(localStorage.getItem('appSyncErrors') || '[]');
    
    return [...errorReports, ...appSyncErrors].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, []);

  // Clear error reports
  const clearErrorReports = useCallback(() => {
    localStorage.removeItem('errorReports');
    localStorage.removeItem('appSyncErrors');
    
    setMetrics(prev => ({
      ...prev,
      errors: [],
    }));
  }, []);

  return {
    healthStatus,
    metrics,
    isMonitoring,
    performHealthCheck,
    startMonitoring,
    stopMonitoring,
    getErrorReports,
    clearErrorReports,
  };
}