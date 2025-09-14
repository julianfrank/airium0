import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Group } from '../../../../shared/src/types/auth';

interface EditGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group;
  onEditGroup: (groupId: string, updates: Partial<Group>) => void;
}

export const EditGroupDialog: React.FC<EditGroupDialogProps> = ({
  open,
  onOpenChange,
  group,
  onEditGroup
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when group changes
  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name,
        description: group.description
      });
    }
  }, [group]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Group name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Group name must be at least 2 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onEditGroup(group.groupId, {
        name: formData.name.trim(),
        description: formData.description.trim()
      });
      
      setErrors({});
    } catch (error) {
      console.error('Error updating group:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setErrors({});
    }
    onOpenChange(newOpen);
  };

  const isSystemGroup = group?.groupId === 'admin' || group?.groupId === 'general';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Group</DialogTitle>
          <DialogDescription>
            Update group information and settings.
            {isSystemGroup && (
              <span className="block mt-2 text-amber-600">
                Note: This is a system group. Some changes may be restricted.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-group-name">Group Name</Label>
            <Input
              id="edit-group-name"
              type="text"
              placeholder="e.g., Marketing Team"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={errors.name ? 'border-destructive' : ''}
              disabled={isSystemGroup}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
            {isSystemGroup && (
              <p className="text-sm text-muted-foreground">
                System group names cannot be changed
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-group-description">Description</Label>
            <textarea
              id="edit-group-description"
              placeholder="Describe the purpose and scope of this group..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                errors.description ? 'border-destructive' : ''
              }`}
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          <div className="bg-muted rounded-lg p-3">
            <div className="text-sm">
              <div className="flex justify-between mb-1">
                <span className="font-medium">Group ID:</span>
                <span className="font-mono text-xs">{group?.groupId}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="font-medium">Applications:</span>
                <span>{group?.applications.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Created:</span>
                <span>{group?.createdAt ? new Date(group.createdAt).toLocaleDateString() : 'Unknown'}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};