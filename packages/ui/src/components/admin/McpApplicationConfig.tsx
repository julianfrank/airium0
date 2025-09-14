import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Application } from '../../../../shared/src/types';

interface McpApplicationConfigProps {
  config: Application['config'];
  onChange: (config: Application['config']) => void;
  error?: string;
}

export const McpApplicationConfig: React.FC<McpApplicationConfigProps> = ({
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

  const handleTransportTypeChange = (transportType: string) => {
    onChange({
      ...config,
      transportType
    });
  };

  const handleAddMcpParam = () => {
    if (newParamKey.trim() && newParamValue.trim()) {
      const updatedParams = {
        ...config.mcpParams,
        [newParamKey.trim()]: newParamValue.trim()
      };
      
      onChange({
        ...config,
        mcpParams: updatedParams
      });
      
      setNewParamKey('');
      setNewParamValue('');
    }
  };

  const handleRemoveMcpParam = (key: string) => {
    const updatedParams = { ...config.mcpParams };
    delete updatedParams[key];
    
    onChange({
      ...config,
      mcpParams: updatedParams
    });
  };

  const handleUpdateMcpParam = (key: string, value: string) => {
    const updatedParams = {
      ...config.mcpParams,
      [key]: value
    };
    
    onChange({
      ...config,
      mcpParams: updatedParams
    });
  };

  return (
    <div className="space-y-4 border rounded-md p-4">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-lg">🔧</span>
        <h4 className="font-medium">MCP Application Configuration</h4>
      </div>

      {/* URL */}
      <div className="space-y-2">
        <Label htmlFor="mcp-url">MCP Server URL *</Label>
        <Input
          id="mcp-url"
          value={config.url || ''}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="mcp://localhost:3000 or uvx package-name"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">
          Use mcp:// for server URLs or uvx commands for package-based MCP servers
        </p>
      </div>

      {/* Transport Type */}
      <div className="space-y-2">
        <Label htmlFor="transport-type">Transport Type</Label>
        <Select
          value={config.transportType || 'stdio'}
          onValueChange={handleTransportTypeChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select transport type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stdio">Standard I/O (stdio)</SelectItem>
            <SelectItem value="websocket">WebSocket</SelectItem>
            <SelectItem value="http">HTTP</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Communication protocol for the MCP server connection
        </p>
      </div>

      {/* MCP Parameters */}
      <div className="space-y-2">
        <Label>MCP Parameters</Label>
        
        {/* Existing Parameters */}
        {config.mcpParams && Object.keys(config.mcpParams).length > 0 && (
          <div className="space-y-2 mb-3">
            {Object.entries(config.mcpParams).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                <Input
                  value={key}
                  readOnly
                  className="flex-1 bg-gray-50"
                  placeholder="Parameter name"
                />
                <span className="text-muted-foreground">=</span>
                <Input
                  value={String(value)}
                  onChange={(e) => handleUpdateMcpParam(key, e.target.value)}
                  className="flex-1"
                  placeholder="Parameter value"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMcpParam(key)}
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
            onClick={handleAddMcpParam}
            disabled={!newParamKey.trim() || !newParamValue.trim()}
          >
            Add
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Configuration parameters specific to this MCP server (e.g., database, timeout, credentials)
        </p>
      </div>

      {/* Common MCP Parameter Examples */}
      <div className="space-y-2">
        <Label>Common Parameters</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setNewParamKey('timeout');
              setNewParamValue('30');
            }}
            className="text-xs"
          >
            + timeout
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setNewParamKey('database');
              setNewParamValue('production');
            }}
            className="text-xs"
          >
            + database
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setNewParamKey('log_level');
              setNewParamValue('INFO');
            }}
            className="text-xs"
          >
            + log_level
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setNewParamKey('max_connections');
              setNewParamValue('10');
            }}
            className="text-xs"
          >
            + max_connections
          </Button>
        </div>
      </div>

      {/* Configuration Preview */}
      {config.url && (
        <div className="space-y-2">
          <Label>MCP Configuration Preview</Label>
          <div className="bg-gray-50 p-3 rounded-md font-mono text-sm">
            <div className="text-blue-600">MCP Server</div>
            <div className="break-all">URL: {config.url}</div>
            <div>Transport: {config.transportType || 'stdio'}</div>
            {config.mcpParams && Object.keys(config.mcpParams).length > 0 && (
              <div className="mt-2">
                <div className="text-gray-600">Parameters:</div>
                {Object.entries(config.mcpParams).map(([key, value]) => (
                  <div key={key} className="ml-2">
                    {key}: {String(value)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};