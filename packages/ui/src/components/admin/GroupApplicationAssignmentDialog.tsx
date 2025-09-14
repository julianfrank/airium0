import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Application, Group } from '@airium/shared';

interface GroupApplicationAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application;
  groups: Group[];
  onUpdateAssignments: (appId: string, groupIds: string[]) => void;
}

export const GroupApplicationAssignmentDialog: React.FC<GroupApplicationAssignmentDialogProps> = ({
  open,
  onOpenChange,
  application,
  groups,
  onUpdateAssignments
}) => {
  const [selectedGroups, setSelectedGroups] = useState<string[]>(application.groups);

  // Reset selected groups when application changes
  useEffect(() => {
    setSelectedGroups(application.groups);
  }, [application.groups]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAssignments(application.appId, selectedGroups);
  };

  const handleCancel = () => {
    setSelectedGroups(application.groups);
    onOpenChange(false);
  };

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
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

  const hasChanges = JSON.stringify(selectedGroups.sort()) !== JSON.stringify(application.groups.sort());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>👥</span>
            <span>Manage Group Access</span>
          </DialogTitle>
          <DialogDescription>
            Configure which groups have access to this application.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Application Info */}
          <div className="border rounded-md p-4 bg-gray-50">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getTypeIcon(application.type)}</span>
              <div className="flex-1">
                <div className="font-medium">{application.name}</div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(application.type)}`}>
                    {application.type}
                  </span>
                  <span className="text-sm text-muted-foreground">ID: {application.appId}</span>
                </div>
              </div>
            </div>
            {application.remarks && (
              <div className="text-sm text-muted-foreground mt-2">
                {application.remarks}
              </div>
            )}
          </div>

          {/* Group Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Group Access</h4>
              <div className="text-sm text-muted-foreground">
                {selectedGroups.length} of {groups.length} groups selected
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-3">
              {groups.map((group) => {
                const isSelected = selectedGroups.includes(group.groupId);
                const wasOriginallySelected = application.groups.includes(group.groupId);
                
                return (
                  <label 
                    key={group.groupId} 
                    className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleGroupToggle(group.groupId)}
                      className="rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{group.name}</span>
                        {wasOriginallySelected && !isSelected && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                            Removing
                          </span>
                        )}
                        {!wasOriginallySelected && isSelected && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Adding
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{group.description}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {group.applications.length} application{group.applications.length !== 1 ? 's' : ''} assigned
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {selectedGroups.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-600">⚠️</span>
                  <div className="text-sm text-yellow-800">
                    <div className="font-medium">No groups selected</div>
                    <div>This application will not be accessible to any users.</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          {hasChanges && (
            <div className="border rounded-md p-3 bg-blue-50">
              <div className="text-sm">
                <div className="font-medium text-blue-900 mb-2">Changes Summary:</div>
                <div className="space-y-1">
                  {application.groups.filter(id => !selectedGroups.includes(id)).map(groupId => {
                    const group = groups.find(g => g.groupId === groupId);
                    return (
                      <div key={groupId} className="text-red-700">
                        - Remove from "{group?.name || groupId}"
                      </div>
                    );
                  })}
                  {selectedGroups.filter(id => !application.groups.includes(id)).map(groupId => {
                    const group = groups.find(g => g.groupId === groupId);
                    return (
                      <div key={groupId} className="text-green-700">
                        + Add to "{group?.name || groupId}"
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!hasChanges}>
              {hasChanges ? 'Save Changes' : 'No Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};