import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Application, Group } from '../../../../shared/src/types';
import { RestApplicationConfig } from './RestApplicationConfig';
import { McpApplicationConfig } from './McpApplicationConfig';
import { InbuiltApplicationConfig } from './InbuiltApplicationConfig';

interface CreateApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: Group[];
  onCreateApplication: (applicationData: {
    type: 'REST' | 'MCP' | 'INBUILT';
    name: string;
    config: Application['config'];
    remarks: string;
    groups: string[];
  }) => void;
}

export const CreateApplicationDialog: React.FC<CreateApplicationDialogProps> = ({
  open,
  onOpenChange,
  groups,
  onCreateApplication
}) => {
  const [formData, setFormData] = useState({
    type: '' as 'REST' | 'MCP' | 'INBUILT' | '',
    name: '',
    config: {} as Application['config'],
    remarks: '',
    groups: [] as string[]
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.type) {
      newErrors.type = 'Application type is required';
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Application name is required';
    }
    
    if (formData.type === 'REST' && !formData.config.url) {
      newErrors.config = 'URL is required for REST applications';
    }
    
    if (formData.type === 'MCP' && !formData.config.url) {
      newErrors.config = 'URL is required for MCP applications';
    }
    
    if (formData.groups.length === 0) {
      newErrors.groups = 'At least one group must be selected';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onCreateApplication({
      type: formData.type as 'REST' | 'MCP' | 'INBUILT',
      name: formData.name.trim(),
      config: formData.config,
      remarks: formData.remarks.trim(),
      groups: formData.groups
    });

    // Reset form
    setFormData({
      type: '',
      name: '',
      config: {},
      remarks: '',
      groups: []
    });
    setErrors({});
  };

  const handleCancel = () => {
    setFormData({
      type: '',
      name: '',
      config: {},
      remarks: '',
      groups: []
    });
    setErrors({});
    onOpenChange(false);
  };

  const handleConfigChange = (config: Application['config']) => {
    setFormData(prev => ({ ...prev, config }));
    if (errors.config) {
      setErrors(prev => ({ ...prev, config: '' }));
    }
  };

  const handleGroupToggle = (groupId: string) => {
    setFormData(prev => ({
      ...prev,
      groups: prev.groups.includes(groupId)
        ? prev.groups.filter(id => id !== groupId)
        : [...prev.groups, groupId]
    }));
    if (errors.groups) {
      setErrors(prev => ({ ...prev, groups: '' }));
    }
  };

  const renderConfigSection = () => {
    switch (formData.type) {
      case 'REST':
        return (
          <RestApplicationConfig
            config={formData.config}
            onChange={handleConfigChange}
            error={errors.config}
          />
        );
      case 'MCP':
        return (
          <McpApplicationConfig
            config={formData.config}
            onChange={handleConfigChange}
            error={errors.config}
          />
        );
      case 'INBUILT':
        return (
          <InbuiltApplicationConfig
            config={formData.config}
            onChange={handleConfigChange}
            error={errors.config}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Application</DialogTitle>
          <DialogDescription>
            Add a new REST, MCP, or inbuilt application to the system.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Application Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Application Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'REST' | 'MCP' | 'INBUILT') => {
                setFormData(prev => ({ ...prev, type: value, config: {} }));
                if (errors.type) setErrors(prev => ({ ...prev, type: '' }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select application type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REST">🌐 REST API</SelectItem>
                <SelectItem value="MCP">🔧 MCP Application</SelectItem>
                <SelectItem value="INBUILT">⚙️ Inbuilt Application</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && <p className="text-sm text-destructive">{errors.type}</p>}
          </div>

          {/* Application Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Application Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }));
                if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
              }}
              placeholder="Enter application name"
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          {/* Configuration Section */}
          {formData.type && (
            <div className="space-y-2">
              <Label>Configuration</Label>
              {renderConfigSection()}
            </div>
          )}

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Input
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              placeholder="Optional description or notes"
            />
          </div>

          {/* Group Assignment */}
          <div className="space-y-2">
            <Label>Group Access *</Label>
            <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
              {groups.map((group) => (
                <label key={group.groupId} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.groups.includes(group.groupId)}
                    onChange={() => handleGroupToggle(group.groupId)}
                    className="rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{group.name}</div>
                    <div className="text-xs text-muted-foreground">{group.description}</div>
                  </div>
                </label>
              ))}
            </div>
            {errors.groups && <p className="text-sm text-destructive">{errors.groups}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">
              Create Application
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};