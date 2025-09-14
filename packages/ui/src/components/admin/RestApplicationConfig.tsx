import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Application } from '@airium/shared';

interface RestApplicationConfigProps {
  config: Application['config'];
  onChange: (config: Application['config']) => void;
  error?: string;
}

export const RestApplicationConfig: React.FC<RestApplicationConfigProps> = ({
  config,
  onChange,
  error
}) => {
  const [newParamKey, setNewParamKey] = useState('');
  const [newParamValue, setNewParamValue] = useState('');

  const handleUrlChange = (url: string) => {
    onChange({
      ...config,
      url
    });
  };

  const handleAddQueryParam = () => {
    if (newParamKey.trim() && newParamValue.trim()) {
      const updatedParams = {
        ...config.queryParams,
        [newParamKey.trim()]: newParamValue.trim()
      };
      
      onChange({
        ...config,
        queryParams: updatedParams
      });
      
      setNewParamKey('');
      setNewParamValue('');
    }
  };

  const handleRemoveQueryParam = (key: string) => {
    const updatedParams = { ...config.queryParams };
    delete updatedParams[key];
    
    onChange({
      ...config,
      queryParams: updatedParams
    });
  };

  const handleUpdateQueryParam = (key: string, value: string) => {
    const updatedParams = {
      ...config.queryParams,
      [key]: value
    };
    
    onChange({
      ...config,
      queryParams: updatedParams
    });
  };

  return (
    <div className="space-y-4 border rounded-md p-4">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-lg">🌐</span>
        <h4 className="font-medium">REST API Configuration</h4>
      </div>

      {/* URL */}
      <div className="space-y-2">
        <Label htmlFor="rest-url">API URL *</Label>
        <Input
          id="rest-url"
          value={config.url || ''}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://api.example.com/v1"
          type="url"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* Query Parameters */}
      <div className="space-y-2">
        <Label>Query Parameters</Label>
        
        {/* Existing Parameters */}
        {config.queryParams && Object.keys(config.queryParams).length > 0 && (
          <div className="space-y-2 mb-3">
            {Object.entries(config.queryParams).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                <Input
                  value={key}
                  readOnly
                  className="flex-1 bg-gray-50"
                  placeholder="Parameter name"
                />
                <span className="text-muted-foreground">=</span>
                <Input
                  value={value}
                  onChange={(e) => handleUpdateQueryParam(key, e.target.value)}
                  className="flex-1"
                  placeholder="Parameter value"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveQueryParam(key)}
                  className="text-destructive hover:text-destructive"
                >
                  🗑️
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Parameter */}
        <div className="flex items-center space-x-2">
          <Input
            value={newParamKey}
            onChange={(e) => setNewParamKey(e.target.value)}
            placeholder="Parameter name"
            className="flex-1"
          />
          <span className="text-muted-foreground">=</span>
          <Input
            value={newParamValue}
            onChange={(e) => setNewParamValue(e.target.value)}
            placeholder="Parameter value"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddQueryParam}
            disabled={!newParamKey.trim() || !newParamValue.trim()}
          >
            Add
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Add query parameters that will be included with every API request.
        </p>
      </div>

      {/* Configuration Preview */}
      {config.url && (
        <div className="space-y-2">
          <Label>Request Preview</Label>
          <div className="bg-gray-50 p-3 rounded-md font-mono text-sm">
            <div className="text-green-600">GET</div>
            <div className="break-all">
              {config.url}
              {config.queryParams && Object.keys(config.queryParams).length > 0 && (
                <>
                  ?{Object.entries(config.queryParams)
                    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                    .join('&')}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};