import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { GroupTable } from './GroupTable';
import { CreateGroupDialog } from './CreateGroupDialog';
import { EditGroupDialog } from './EditGroupDialog';
import { DeleteGroupDialog } from './DeleteGroupDialog';
import { Group } from '@airium/shared';

interface GroupManagementProps {
  className?: string;
}

export const GroupManagement: React.FC<GroupManagementProps> = ({ className }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // Mock data for now - will be replaced with actual API calls
  useEffect(() => {
    const loadGroups = async () => {
      try {
        setLoading(true);
        
        // Mock groups data
        const mockGroups: Group[] = [
          {
            PK: 'GROUP#admin',
            SK: 'METADATA',
            groupId: 'admin',
            name: 'Administrators',
            description: 'System administrators with full access to all features',
            applications: ['user-management', 'app-management', 'system-settings'],
            createdAt: '2024-01-01T00:00:00Z'
          },
          {
            PK: 'GROUP#general',
            SK: 'METADATA',
            groupId: 'general',
            name: 'General Users',
            description: 'Standard users with access to basic features',
            applications: ['chat-interface', 'media-upload'],
            createdAt: '2024-01-01T00:00:00Z'
          },
          {
            PK: 'GROUP#developers',
            SK: 'METADATA',
            groupId: 'developers',
            name: 'Developers',
            description: 'Development team with extended access to development tools',
            applications: ['chat-interface', 'media-upload', 'api-tools', 'debug-console'],
            createdAt: '2024-01-01T00:00:00Z'
          },
          {
            PK: 'GROUP#managers',
            SK: 'METADATA',
            groupId: 'managers',
            name: 'Managers',
            description: 'Management team with access to reporting and analytics',
            applications: ['chat-interface', 'media-upload', 'analytics', 'reports'],
            createdAt: '2024-01-02T00:00:00Z'
          }
        ];

        setGroups(mockGroups);
      } catch (err) {
        setError('Failed to load groups');
        console.error('Error loading groups:', err);
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, []);

  const handleCreateGroup = async (groupData: { name: string; description: string }) => {
    try {
      // Mock group creation - will be replaced with actual API call
      const newGroup: Group = {
        PK: `GROUP#${Date.now()}`,
        SK: 'METADATA',
        groupId: Date.now().toString(),
        name: groupData.name,
        description: groupData.description,
        applications: [],
        createdAt: new Date().toISOString()
      };

      setGroups(prev => [...prev, newGroup]);
      setCreateDialogOpen(false);
    } catch (err) {
      setError('Failed to create group');
      console.error('Error creating group:', err);
    }
  };

  const handleEditGroup = async (groupId: string, updates: Partial<Group>) => {
    try {
      // Mock group update - will be replaced with actual API call
      setGroups(prev => prev.map(group => 
        group.groupId === groupId 
          ? { ...group, ...updates }
          : group
      ));
      setEditDialogOpen(false);
      setSelectedGroup(null);
    } catch (err) {
      setError('Failed to update group');
      console.error('Error updating group:', err);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      // Mock group deletion - will be replaced with actual API call
      setGroups(prev => prev.filter(group => group.groupId !== groupId));
      setDeleteDialogOpen(false);
      setSelectedGroup(null);
    } catch (err) {
      setError('Failed to delete group');
      console.error('Error deleting group:', err);
    }
  };

  const openEditDialog = (group: Group) => {
    setSelectedGroup(group);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (group: Group) => {
    setSelectedGroup(group);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading groups...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Group Management</CardTitle>
              <CardDescription>
                Manage user groups and their application access permissions
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              Add Group
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          
          <GroupTable
            groups={groups}
            onEditGroup={openEditDialog}
            onDeleteGroup={openDeleteDialog}
          />
        </CardContent>
      </Card>

      <CreateGroupDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateGroup={handleCreateGroup}
      />

      {selectedGroup && (
        <>
          <EditGroupDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            group={selectedGroup}
            onEditGroup={handleEditGroup}
          />

          <DeleteGroupDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            group={selectedGroup}
            onDeleteGroup={handleDeleteGroup}
          />
        </>
      )}
    </div>
  );
};