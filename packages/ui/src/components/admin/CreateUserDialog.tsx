import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Group } from '../../../../shared/src/types/auth';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: Group[];
  onCreateUser: (userData: { email: string; profile: 'ADMIN' | 'GENERAL'; groups: string[] }) => void;
}

export const CreateUserDialog: React.FC<CreateUserDialogProps> = ({
  open,
  onOpenChange,
  groups,
  onCreateUser
}) => {
  const [formData, setFormData] = useState({
    email: '',
    profile: 'GENERAL' as 'ADMIN' | 'GENERAL',
    selectedGroups: [] as string[]
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.selectedGroups.length === 0) {
      newErrors.groups = 'At least one group must be selected';
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
      await onCreateUser({
        email: formData.email,
        profile: formData.profile,
        groups: formData.selectedGroups
      });
      
      // Reset form
      setFormData({
        email: '',
        profile: 'GENERAL',
        selectedGroups: []
      });
      setErrors({});
    } catch (error) {
      console.error('Error creating user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGroupToggle = (groupId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedGroups: prev.selectedGroups.includes(groupId)
        ? prev.selectedGroups.filter(id => id !== groupId)
        : [...prev.selectedGroups, groupId]
    }));
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setFormData({
        email: '',
        profile: 'GENERAL',
        selectedGroups: []
      });
      setErrors({});
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Add a new user to the system. They will receive an invitation email to set up their account.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile">User Profile</Label>
            <Select
              value={formData.profile}
              onValueChange={(value: 'ADMIN' | 'GENERAL') => 
                setFormData(prev => ({ ...prev, profile: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user profile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GENERAL">General User</SelectItem>
                <SelectItem value="ADMIN">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Groups</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
              {groups.map((group) => (
                <div key={group.groupId} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`group-${group.groupId}`}
                    checked={formData.selectedGroups.includes(group.groupId)}
                    onChange={() => handleGroupToggle(group.groupId)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label
                    htmlFor={`group-${group.groupId}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {group.name}
                  </label>
                </div>
              ))}
            </div>
            {errors.groups && (
              <p className="text-sm text-destructive">{errors.groups}</p>
            )}
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
              {isSubmitting ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};