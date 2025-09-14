import React from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Application } from '@airium/shared';

interface DeleteApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application;
  onDeleteApplication: (appId: string) => void;
}

export const DeleteApplicationDialog: React.FC<DeleteApplicationDialogProps> = ({
  open,
  onOpenChange,
  application,
  onDeleteApplication
}) => {
  const handleDelete = () => {
    onDeleteApplication(application.appId);
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

  const getTypeColor = (type: Application['type']) => {
    switch (type) {
      case 'REST':
        return 'bg-blue-100 text-blue-800';
      case 'MCP':
        return 'bg-green-100 text-green-800';
      case 'INBUILT':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-destructive">
            <span>🗑️</span>
            <span>Delete Application</span>
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The application will be permanently removed from the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Application Details */}
          <div className="border rounded-md p-4 bg-gray-50">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-2xl">{getTypeIcon(application.type)}</span>
              <div className="flex-1">
                <div className="font-medium text-lg">{application.name}</div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(application.type)}`}>
                    {application.type}
                  </span>
                  <span className="text-sm text-muted-foreground">ID: {application.appId}</span>
                </div>
              </div>
            </div>

            {application.remarks && (
              <div className="text-sm text-muted-foreground mb-3">
                {application.remarks}
              </div>
            )}

            <div className="text-sm">
              <div className="font-medium mb-1">Assigned to groups:</div>
              <div className="text-muted-foreground">
                {application.groups.length > 0 
                  ? application.groups.join(', ')
                  : 'No groups assigned'
                }
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <span className="text-destructive text-lg">⚠️</span>
              <div className="text-sm">
                <div className="font-medium text-destructive mb-1">Warning</div>
                <div className="text-destructive/80">
                  Deleting this application will:
                </div>
                <ul className="list-disc list-inside text-destructive/80 mt-1 space-y-1">
                  <li>Remove it from all assigned groups</li>
                  <li>Make it unavailable to all users</li>
                  <li>Permanently delete its configuration</li>
                  {application.groups.length > 0 && (
                    <li>Affect {application.groups.length} group{application.groups.length !== 1 ? 's' : ''}</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Confirmation */}
          <div className="text-sm text-muted-foreground">
            Type the application name to confirm deletion:
            <div className="font-mono font-medium mt-1">{application.name}</div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleDelete}
          >
            Delete Application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};