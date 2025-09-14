import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ApplicationTable } from './ApplicationTable';
import { CreateApplicationDialog } from './CreateApplicationDialog';
import { EditApplicationDialog } from './EditApplicationDialog';
import { DeleteApplicationDialog } from './DeleteApplicationDialog';
import { GroupApplicationAssignmentDialog } from './GroupApplicationAssignmentDialog';
import { Application, Group } from '@airium/shared';

interface ApplicationManagementProps {
  className?: string;
}

export const ApplicationManagement: React.FC<ApplicationManagementProps> = ({ className }) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  // Mock data for now - will be replaced with actual API calls
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Mock applications data
        const mockApplications: Application[] = [
          {
            PK: 'APP#1',
            SK: 'METADATA',
            appId: '1',
            type: 'REST',
            name: 'Weather API',
            config: {
              url: 'https://api.weather.com/v1',
              queryParams: { 'api_key': 'xxx', 'format': 'json' }
            },
            remarks: 'External weather service integration',
            groups: ['general', 'developers'],
            createdAt: '2024-01-01T00:00:00Z'
          },
          {
            PK: 'APP#2',
            SK: 'METADATA',
            appId: '2',
            type: 'MCP',
            name: 'Database Tools',
            config: {
              url: 'mcp://localhost:3000',
              transportType: 'stdio',
              mcpParams: { 'database': 'production', 'timeout': 30 }
            },
            remarks: 'Database management and query tools',
            groups: ['admin', 'developers'],
            createdAt: '2024-01-02T00:00:00Z'
          },
          {
            PK: 'APP#3',
            SK: 'METADATA',
            appId: '3',
            type: 'INBUILT',
            name: 'Chat Interface',
            config: {
              url: '/chat'
            },
            remarks: 'Built-in AI chat functionality',
            groups: ['general', 'admin', 'developers'],
            createdAt: '2024-01-03T00:00:00Z'
          },
          {
            PK: 'APP#4',
            SK: 'METADATA',
            appId: '4',
            type: 'REST',
            name: 'News API',
            config: {
              url: 'https://newsapi.org/v2',
              queryParams: { 'apiKey': 'xxx', 'country': 'us' }
            },
            remarks: 'Latest news and articles',
            groups: ['general'],
            createdAt: '2024-01-04T00:00:00Z'
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
            applications: ['1', '2', '3'],
            createdAt: '2024-01-01T00:00:00Z'
          },
          {
            PK: 'GROUP#general',
            SK: 'METADATA',
            groupId: 'general',
            name: 'General Users',
            description: 'Standard users with basic access',
            applications: ['1', '3', '4'],
            createdAt: '2024-01-01T00:00:00Z'
          },
          {
            PK: 'GROUP#developers',
            SK: 'METADATA',
            groupId: 'developers',
            name: 'Developers',
            description: 'Development team with extended access',
            applications: ['1', '2', '3'],
            createdAt: '2024-01-01T00:00:00Z'
          }
        ];

        setApplications(mockApplications);
        setGroups(mockGroups);
      } catch (err) {
        setError('Failed to load application data');
        console.error('Error loading application data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCreateApplication = async (applicationData: {
    type: 'REST' | 'MCP' | 'INBUILT';
    name: string;
    config: Application['config'];
    remarks: string;
    groups: string[];
  }) => {
    try {
      // Mock application creation - will be replaced with actual API call
      const newApplication: Application = {
        PK: `APP#${Date.now()}`,
        SK: 'METADATA',
        appId: Date.now().toString(),
        type: applicationData.type,
        name: applicationData.name,
        config: applicationData.config,
        remarks: applicationData.remarks,
        groups: applicationData.groups,
        createdAt: new Date().toISOString()
      };

      setApplications(prev => [...prev, newApplication]);
      setCreateDialogOpen(false);
    } catch (err) {
      setError('Failed to create application');
      console.error('Error creating application:', err);
    }
  };

  const handleEditApplication = async (appId: string, updates: Partial<Application>) => {
    try {
      // Mock application update - will be replaced with actual API call
      setApplications(prev => prev.map(app => 
        app.appId === appId 
          ? { ...app, ...updates }
          : app
      ));
      setEditDialogOpen(false);
      setSelectedApplication(null);
    } catch (err) {
      setError('Failed to update application');
      console.error('Error updating application:', err);
    }
  };

  const handleDeleteApplication = async (appId: string) => {
    try {
      // Mock application deletion - will be replaced with actual API call
      setApplications(prev => prev.filter(app => app.appId !== appId));
      setDeleteDialogOpen(false);
      setSelectedApplication(null);
    } catch (err) {
      setError('Failed to delete application');
      console.error('Error deleting application:', err);
    }
  };

  const handleUpdateGroupAssignments = async (appId: string, groupIds: string[]) => {
    try {
      // Mock group assignment update - will be replaced with actual API call
      setApplications(prev => prev.map(app => 
        app.appId === appId 
          ? { ...app, groups: groupIds }
          : app
      ));
      setAssignmentDialogOpen(false);
      setSelectedApplication(null);
    } catch (err) {
      setError('Failed to update group assignments');
      console.error('Error updating group assignments:', err);
    }
  };

  const openEditDialog = (application: Application) => {
    setSelectedApplication(application);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (application: Application) => {
    setSelectedApplication(application);
    setDeleteDialogOpen(true);
  };

  const openAssignmentDialog = (application: Application) => {
    setSelectedApplication(application);
    setAssignmentDialogOpen(true);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading applications...</p>
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
              <CardTitle>Application Management</CardTitle>
              <CardDescription>
                Manage REST, MCP, and inbuilt applications and their group assignments
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              Add Application
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          
          <ApplicationTable
            applications={applications}
            groups={groups}
            onEditApplication={openEditDialog}
            onDeleteApplication={openDeleteDialog}
            onManageGroups={openAssignmentDialog}
          />
        </CardContent>
      </Card>

      <CreateApplicationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        groups={groups}
        onCreateApplication={handleCreateApplication}
      />

      {selectedApplication && (
        <>
          <EditApplicationDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            application={selectedApplication}
            groups={groups}
            onEditApplication={handleEditApplication}
          />

          <DeleteApplicationDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            application={selectedApplication}
            onDeleteApplication={handleDeleteApplication}
          />

          <GroupApplicationAssignmentDialog
            open={assignmentDialogOpen}
            onOpenChange={setAssignmentDialogOpen}
            application={selectedApplication}
            groups={groups}
            onUpdateAssignments={handleUpdateGroupAssignments}
          />
        </>
      )}
    </div>
  );
};