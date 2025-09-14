import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Group } from '../../../../shared/src/types/auth';

interface DeleteGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group;
  onDeleteGroup: (groupId: string) => void;
}

export const DeleteGroupDialog: React.FC<DeleteGroupDialogProps> = ({
  open,
  onOpenChange,
  group,
  onDeleteGroup
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteGroup(group.groupId);
    } catch (error) {
      console.error('Error deleting group:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const isSystemGroup = group?.groupId === 'admin' || group?.groupId === 'general';

  if (isSystemGroup) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cannot Delete System Group</DialogTitle>
            <DialogDescription>
              This is a system group that cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Group:</span>
                  <span>{group.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Type:</span>
                  <span className="px-2 py-1 rounded text-xs bg-amber-100 text-amber-800">
                    System Group
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>System groups</strong> like "admin" and "general" are required for the system to function properly and cannot be deleted.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Group</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this group? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="bg-muted rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Name:</span>
                <span>{group.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Description:</span>
                <span className="text-sm max-w-xs truncate" title={group.description}>
                  {group.description}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Applications:</span>
                <span>{group.applications.length}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">
              <strong>Warning:</strong> Deleting this group will:
            </p>
            <ul className="text-sm text-destructive mt-2 ml-4 list-disc">
              <li>Remove all users from this group</li>
              <li>Remove access to all assigned applications</li>
              <li>Permanently delete the group configuration</li>
              <li>This action cannot be undone</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};