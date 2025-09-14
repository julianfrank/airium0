import React from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Application } from '@airium/shared';

interface InbuiltApplicationConfigProps {
  config: Application['config'];
  onChange: (config: Application['config']) => void;
  error?: string;
}

const INBUILT_APPLICATIONS = [
  { path: '/chat', name: 'AI Chat Interface', description: 'Text and voice chat with AI' },
  { path: '/media', name: 'Media Manager', description: 'Upload and manage files' },
  { path: '/voice', name: 'Voice Interface', description: 'Nova Sonic voice interactions' },
  { path: '/dashboard', name: 'User Dashboard', description: 'Personal dashboard and overview' },
  { path: '/settings', name: 'User Settings', description: 'Account and preference settings' },
  { path: '/applications', name: 'Application Grid', description: 'Available applications view' },
  { path: '/notes', name: 'Notes Manager', description: 'Create and manage notes' },
  { path: '/history', name: 'Chat History', description: 'View conversation history' }
];

export const InbuiltApplicationConfig: React.FC<InbuiltApplicationConfigProps> = ({
  config,
  onChange,
  error
}) => {
  const handleUrlChange = (url: string) => {
    onChange({
      ...config,
      url
    });
  };

  const handleCustomUrlChange = (customUrl: string) => {
    onChange({
      ...config,
      url: customUrl
    });
  };

  const selectedApp = INBUILT_APPLICATIONS.find(app => app.path === config.url);
  const isCustomUrl = config.url && !INBUILT_APPLICATIONS.some(app => app.path === config.url);

  return (
    <div className="space-y-4 border rounded-md p-4">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-lg">⚙️</span>
        <h4 className="font-medium">Inbuilt Application Configuration</h4>
      </div>

      {/* Application Selection */}
      <div className="space-y-2">
        <Label htmlFor="inbuilt-app">Select Inbuilt Application</Label>
        <Select
          value={isCustomUrl ? 'custom' : config.url || ''}
          onValueChange={(value) => {
            if (value === 'custom') {
              handleUrlChange('');
            } else {
              handleUrlChange(value);
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose an inbuilt application" />
          </SelectTrigger>
          <SelectContent>
            {INBUILT_APPLICATIONS.map((app) => (
              <SelectItem key={app.path} value={app.path}>
                <div className="flex flex-col">
                  <span className="font-medium">{app.name}</span>
                  <span className="text-xs text-muted-foreground">{app.description}</span>
                </div>
              </SelectItem>
            ))}
            <SelectItem value="custom">
              <div className="flex flex-col">
                <span className="font-medium">Custom Path</span>
                <span className="text-xs text-muted-foreground">Enter a custom application path</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* Custom URL Input */}
      {(isCustomUrl || (!config.url && config.url !== undefined)) && (
        <div className="space-y-2">
          <Label htmlFor="custom-url">Custom Application Path</Label>
          <Input
            id="custom-url"
            value={config.url || ''}
            onChange={(e) => handleCustomUrlChange(e.target.value)}
            placeholder="/custom-app"
          />
          <p className="text-xs text-muted-foreground">
            Enter a custom path for the inbuilt application (e.g., /my-custom-feature)
          </p>
        </div>
      )}

      {/* Selected Application Info */}
      {selectedApp && (
        <div className="space-y-2">
          <Label>Application Details</Label>
          <div className="bg-blue-50 p-3 rounded-md">
            <div className="font-medium text-blue-900">{selectedApp.name}</div>
            <div className="text-sm text-blue-700 mt-1">{selectedApp.description}</div>
            <div className="text-xs text-blue-600 mt-2 font-mono">Path: {selectedApp.path}</div>
          </div>
        </div>
      )}

      {/* Configuration Preview */}
      {config.url && (
        <div className="space-y-2">
          <Label>Application Preview</Label>
          <div className="bg-gray-50 p-3 rounded-md font-mono text-sm">
            <div className="text-purple-600">Inbuilt Application</div>
            <div className="break-all">
              Route: {config.url}
            </div>
            <div className="text-xs text-gray-600 mt-2">
              This application is part of the UI module and will be rendered as a React component.
            </div>
          </div>
        </div>
      )}

      {/* Usage Guidelines */}
      <div className="space-y-2">
        <Label>Usage Guidelines</Label>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Inbuilt applications are React components within the UI module</p>
          <p>• They have access to the full application context and state</p>
          <p>• Custom paths should follow the pattern /feature-name</p>
          <p>• Ensure the corresponding React component exists for custom paths</p>
        </div>
      </div>
    </div>
  );
};