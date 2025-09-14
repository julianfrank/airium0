import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { UserTable } from './UserTable';
import { CreateUserDialog } from './CreateUserDialog';
import { EditUserDialog } from './EditUserDialog';
import { DeleteUserDialog } from './DeleteUserDialog';
import { User, Group } from '../../../../shared/src/types/auth';

interface UserManagementProps {
  className?: string;
}

export const UserManagement: React.FC<UserManagementProps> = ({ className }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Mock data for now - will be replaced with actual API calls
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Mock users data
        const mockUsers: User[] = [
          {
            PK: 'USER#1',
            SK: 'PROFILE',
            userId: '1',
            email: 'admin@airium.com',
            profile: 'ADMIN',
            groups: ['admin', 'general'],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          {
            PK: 'USER#2',
            SK: 'PROFILE',
            userId: '2',
            email: 'user1@airium.com',
            profile: 'GENERAL',
            groups: ['general'],
            createdAt: '2024-01-02T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z'
          },
          {
            PK: 'USER#3',
            SK: 'PROFILE',
            userId: '3',
            email: 'user2@airium.com',
            profile: 'GENERAL',
            groups: ['general', 'developers'],
            createdAt: '2024-01-03T00:00:00Z',
            updatedAt: '2024-01-03T00:00:00Z'
          }
        ];

        // Mock groups data
        const mockGroups: Group[] = [
          {
            PK: 'GROUP#admin',
            SK: 'METADATA',
            groupId: 'admin',
            name: 'Administrators',
            description: 'System administrators with full access',
            applications: ['user-management', 'app-management', 'system-settings'],
            createdAt: '2024-01-01T00:00:00Z'
          },
          {
            PK: 'GROUP#general',
            SK: 'METADATA',
            groupId: 'general',
            name: 'General Users',
            description: 'Standard users with basic access',
            applications: ['chat-interface', 'media-upload'],
            createdAt: '2024-01-01T00:00:00Z'
          },
          {
            PK: 'GROUP#developers',
            SK: 'METADATA',
            groupId: 'developers',
            name: 'Developers',
            description: 'Development team with extended access',
            applications: ['chat-interface', 'media-upload', 'api-tools'],
            createdAt: '2024-01-01T00:00:00Z'
          }
        ];

        setUsers(mockUsers);
        setGroups(mockGroups);
      } catch (err) {
        setError('Failed to load user data');
        console.error('Error loading user data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCreateUser = async (userData: { email: string; profile: 'ADMIN' | 'GENERAL'; groups: string[] }) => {
    try {
      // Mock user creation - will be replaced with actual API call
      const newUser: User = {
        PK: `USER#${Date.now()}`,
        SK: 'PROFILE',
        userId: Date.now().toString(),
        email: userData.email,
        profile: userData.profile,
        groups: userData.groups,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setUsers(prev => [...prev, newUser]);
      setCreateDialogOpen(false);
    } catch (err) {
      setError('Failed to create user');
      console.error('Error creating user:', err);
    }
  };

  const handleEditUser = async (userId: string, updates: Partial<User>) => {
    try {
      // Mock user update - will be replaced with actual API call
      setUsers(prev => prev.map(user => 
        user.userId === userId 
          ? { ...user, ...updates, updatedAt: new Date().toISOString() }
          : user
      ));
      setEditDialogOpen(false);
      setSelectedUser(null);
    } catch (err) {
      setError('Failed to update user');
      console.error('Error updating user:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // Mock user deletion - will be replaced with actual API call
      setUsers(prev => prev.filter(user => user.userId !== userId));
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (err) {
      setError('Failed to delete user');
      console.error('Error deleting user:', err);
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading users...</p>
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
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user accounts, profiles, and group assignments
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          
          <UserTable
            users={users}
            groups={groups}
            onEditUser={openEditDialog}
            onDeleteUser={openDeleteDialog}
          />
        </CardContent>
      </Card>

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        groups={groups}
        onCreateUser={handleCreateUser}
      />

      {selectedUser && (
        <>
          <EditUserDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            user={selectedUser}
            groups={groups}
            onEditUser={handleEditUser}
          />

          <DeleteUserDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            user={selectedUser}
            onDeleteUser={handleDeleteUser}
          />
        </>
      )}
    </div>
  );
};