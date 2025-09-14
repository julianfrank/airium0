import React, { useState } from 'react';
import { Application } from '@airium/shared/types';
import { Card } from '../ui/card';

interface ApplicationLauncherProps {
  application: Application;
  isOpen: boolean;
  onClose: () => void;
}

export const ApplicationLauncher: React.FC<ApplicationLauncherProps> = ({
  application,
  isOpen,
  onClose
}) => {
  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunch = async () => {
    setIsLaunching(true);
    
    try {
      switch (application.type) {
        case 'REST':
          await launchRestApplication(application);
          break;
        case 'MCP':
          await launchMcpApplication(application);
          break;
        case 'INBUILT':
          await launchInbuiltApplication(application);
          break;
        default:
          throw new Error(`Unsupported application type: ${application.type}`);
      }
    } catch (error) {
      console.error('Failed to launch application:', error);
      // TODO: Show error toast/notification
    } finally {
      setIsLaunching(false);
      onClose();
    }
  };

  const launchRestApplication = async (app: Application) => {
    const { url, queryParams } = app.config;
    
    if (!url) {
      throw new Error('REST application URL is not configured');
    }

    // Build URL with query parameters
    const urlObj = new URL(url);
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        urlObj.searchParams.set(key, value);
      });
    }

    // Open in new tab/window
    window.open(urlObj.toString(), '_blank', 'noopener,noreferrer');
  };

  const launchMcpApplication = async (app: Application) => {
    // For MCP applications, we would typically establish a connection
    // and integrate with the chat interface
    console.log('Launching MCP application:', app);
    
    // TODO: Implement MCP application launch logic
    // This would involve:
    // 1. Establishing MCP connection
    // 2. Registering tools/capabilities
    // 3. Integrating with chat interface
    
    // For now, show a placeholder message
    alert(`MCP Application "${app.name}" integration coming soon!`);
  };

  const launchInbuiltApplication = async (app: Application) => {
    const { url } = app.config;
    
    if (!url) {
      throw new Error('Inbuilt application URL is not configured');
    }

    // Navigate to internal route
    if (url.startsWith('/')) {
      window.location.href = url;
    } else {
      // If it's a full URL, open in new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const renderApplicationDetails = () => {
    switch (application.type) {
      case 'REST':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Endpoint URL</label>
              <p className="text-sm font-mono bg-muted p-2 rounded mt-1">
                {application.config.url || 'Not configured'}
              </p>
            </div>
            {application.config.queryParams && Object.keys(application.config.queryParams).length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Query Parameters</label>
                <div className="mt-1 space-y-1">
                  {Object.entries(application.config.queryParams).map(([key, value]) => (
                    <div key={key} className="text-sm bg-muted p-2 rounded">
                      <span className="font-mono">{key}</span>: <span className="font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'MCP':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Transport Type</label>
              <p className="text-sm bg-muted p-2 rounded mt-1">
                {application.config.transportType || 'Not configured'}
              </p>
            </div>
            {application.config.mcpParams && Object.keys(application.config.mcpParams).length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">MCP Parameters</label>
                <div className="mt-1 space-y-1">
                  {Object.entries(application.config.mcpParams).map(([key, value]) => (
                    <div key={key} className="text-sm bg-muted p-2 rounded">
                      <span className="font-mono">{key}</span>: <span className="font-mono">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'INBUILT':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Internal Route</label>
              <p className="text-sm font-mono bg-muted p-2 rounded mt-1">
                {application.config.url || 'Not configured'}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <h2 className="text-lg font-semibold">Launch Application</h2>
          <p className="text-sm text-muted-foreground">
            Configure and launch "{application.name}"
          </p>
        </div>

        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{application.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                application.type === 'REST' ? 'bg-blue-100 text-blue-800' :
                application.type === 'MCP' ? 'bg-green-100 text-green-800' :
                'bg-purple-100 text-purple-800'
              }`}>
                {application.type}
              </span>
            </div>

            {application.remarks && (
              <p className="text-sm text-muted-foreground">{application.remarks}</p>
            )}

            {renderApplicationDetails()}
          </div>
        </Card>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <button
            onClick={onClose}
            disabled={isLaunching}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            disabled={isLaunching}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            {isLaunching ? 'Launching...' : 'Launch'}
          </button>
        </div>
      </div>
    </div>
  );
};