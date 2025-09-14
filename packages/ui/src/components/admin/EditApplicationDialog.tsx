import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Application, Group } from '../../../../shared/src/types';
import { RestApplicationConfig } from './RestApplicationConfig';
import { McpApplicationConfig } from './McpApplicationConfig';
import { InbuiltApplicationConfig } from './InbuiltApplicationConfig';

interface EditApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application;
  groups: Group[];
  onEditApplication: (appId: string, updates: Partial<Application>) => void;
}

export const EditApplicationDialog: React.FC<EditApplicationDialogProps> = ({
  open,
  onOpenChange,
  application,
  groups,
  onEditApplication
}) => {
  const [formData, setFormData] = useState({
    name: application.name,
    config: application.config,
    remarks: application.remarks,
    groups: application.groups
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form data when application changes
  useEffect(() => {
    setFormData({
      name: application.name,
      config: application.config,
      remarks: application.remarks,
      groups: application.groups
    });
    setErrors({});
  }, [application]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Application name is required';
    }
    
    if (application.type === 'REST' && !formData.config.url) {
      newErrors.config = 'URL is required for REST applications';
    }
    
    if (application.type === 'MCP' && !formData.config.url) {
      newErrors.config = 'URL is required for MCP applications';
    }
    
    if (formData.groups.length === 0) {
      newErrors.groups = 'At least one group must be selected';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onEditApplication(application.appId, {
      name: formData.name.trim(),
      config: formData.config,
      remarks: formData.remarks.trim(),
      groups: formData.groups
    });
  };

  const handleCancel = () => {
    setFormData({
      name: application.name,
      config: application.config,
      remarks: application.remarks,
      groups: application.groups
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
    switch (application.type) {
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

  const getTypeIcon = (type: Application['type']) => {
    switch (type) {
      case 'REST':
        return '🌐';
      case 'MCP':
        return '🔧';
      case 'INBUILT':
        return '⚙️';
      default:
        return '📱';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>{getTypeIcon(application.type)}</span>
            <span>Edit {application.type} Application</span>
          </DialogTitle>
          <DialogDescription>
            Modify the configuration and settings for "{application.name}".
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Application Type (Read-only) */}
          <div className="space-y-2">
            <Label>Application Type</Label>
            <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
              <span className="text-lg">{getTypeIcon(application.type)}</span>
              <span className="font-medium">{application.type}</span>
              <span className="text-sm text-muted-foreground">
                (Type cannot be changed after creation)
              </span>
            </div>
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
          <div className="space-y-2">
            <Label>Configuration</Label>
            {renderConfigSection()}
          </div>

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

          {/* Application Info */}
          <div className="space-y-2">
            <Label>Application Information</Label>
            <div className="bg-gray-50 p-3 rounded-md text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Application ID:</span>
                  <div className="font-mono text-xs">{application.appId}</div>
                </div>
                <div>
                  <span className="font-medium">Created:</span>
                  <div className="text-xs">{new Date(application.createdAt).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};