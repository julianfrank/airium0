import React, { useEffect, useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useHealthMonitoring } from '../../lib/use-health-monitoring';
import type { ServiceHealth, ErrorMetric } from '../../lib/use-health-monitoring';

export function MonitoringDashboard() {
  const {
    healthStatus,
    metrics,
    isMonitoring,
    performHealthCheck,
    startMonitoring,
    stopMonitoring,
    getErrorReports,
    clearErrorReports,
  } = useHealthMonitoring();

  const [errorReports, setErrorReports] = useState<any[]>([]);

  useEffect(() => {
    // Start monitoring when component mounts
    const cleanup = startMonitoring(30000); // Check every 30 seconds
    
    return cleanup;
  }, [startMonitoring]);

  useEffect(() => {
    // Update error reports
    setErrorReports(getErrorReports());
  }, [getErrorReports, healthStatus]);

  const getStatusColor = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'unhealthy': return '❌';
      default: return '❓';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">System Monitoring</h2>
        <div className="flex space-x-2">
          <Button
            onClick={performHealthCheck}
            variant="outline"
            size="sm"
          >
            Refresh
          </Button>
          <Button
            onClick={isMonitoring ? stopMonitoring : () => startMonitoring()}
            variant={isMonitoring ? "destructive" : "default"}
            size="sm"
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card className="p-6">
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(healthStatus.overall)}`}>
            {getStatusIcon(healthStatus.overall)} {healthStatus.overall.toUpperCase()}
          </div>
          <div className="text-sm text-gray-600">
            Last updated: {formatTimestamp(healthStatus.lastUpdated)}
          </div>
          {isMonitoring && (
            <div className="flex items-center space-x-1 text-sm text-blue-600">
              <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full"></div>
              <span>Monitoring active</span>
            </div>
          )}
        </div>
      </Card>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="errors">Error Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(healthStatus.services).map(([serviceName, service]) => (
              <Card key={serviceName} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold capitalize">{serviceName}</h3>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(service.status)}`}>
                    {getStatusIcon(service.status)} {service.status}
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  {service.responseTime && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Response Time:</span>
                      <span>{formatDuration(service.responseTime)}</span>
                    </div>
                  )}
                  
                  {service.errorRate !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Error Rate:</span>
                      <span>{(service.errorRate * 100).toFixed(1)}%</span>
                    </div>
                  )}
                  
                  {service.lastError && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-xs">
                      <div className="font-medium text-red-800">Last Error:</div>
                      <div className="text-red-600 truncate">{service.lastError}</div>
                      {service.lastErrorTime && (
                        <div className="text-red-500 mt-1">
                          {formatTimestamp(service.lastErrorTime)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.totalRequests}</div>
              <div className="text-sm text-gray-600">Total Requests</div>
            </Card>
            
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.successfulRequests}</div>
              <div className="text-sm text-gray-600">Successful</div>
            </Card>
            
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{metrics.failedRequests}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </Card>
            
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{formatDuration(metrics.averageResponseTime)}</div>
              <div className="text-sm text-gray-600">Avg Response Time</div>
            </Card>
          </div>

          {metrics.errors.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Error Summary</h3>
              <div className="space-y-2">
                {metrics.errors.map((error, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{error.service}</span>
                      <span className="text-gray-600 ml-2">{error.error}</span>
                    </div>
                    <div className="text-red-600 font-medium">{error.count} errors</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Recent Error Reports</h3>
            <Button
              onClick={() => {
                clearErrorReports();
                setErrorReports([]);
              }}
              variant="outline"
              size="sm"
            >
              Clear All
            </Button>
          </div>

          {errorReports.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              No error reports found
            </Card>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {errorReports.slice(0, 50).map((error, index) => (
                <Card key={index} className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                        {error.type || 'Error'}
                      </span>
                      <span className="text-sm text-gray-600">
                        {formatTimestamp(error.timestamp)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm font-medium mb-1">{error.message}</div>
                  
                  {error.context && (
                    <div className="text-xs text-gray-600">
                      Context: {JSON.stringify(error.context, null, 2)}
                    </div>
                  )}
                  
                  {error.stack && process.env.NODE_ENV === 'development' && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-gray-500">
                        Stack Trace
                      </summary>
                      <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}