import React from 'react';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Application, Group } from '@airium/shared';

interface ApplicationTableProps {
  applications: Application[];
  groups: Group[];
  onEditApplication: (application: Application) => void;
  onDeleteApplication: (application: Application) => void;
  onManageGroups: (application: Application) => void;
}

export const ApplicationTable: React.FC<ApplicationTableProps> = ({
  applications,
  groups,
  onEditApplication,
  onDeleteApplication,
  onManageGroups
}) => {
  const getGroupNames = (groupIds: string[]) => {
    return groupIds
      .map(id => groups.find(g => g.groupId === id)?.name || id)
      .join(', ');
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

  const formatConfig = (config: Application['config'], type: Application['type']) => {
    if (type === 'REST') {
      return config.url || 'No URL configured';
    } else if (type === 'MCP') {
      return `${config.url || 'No URL'} (${config.transportType || 'stdio'})`;
    } else if (type === 'INBUILT') {
      return config.url || 'Built-in component';
    }
    return 'Not configured';
  };

  if (applications.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">📱</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
        <p className="text-gray-500 mb-4">Get started by creating your first application.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Configuration</TableHead>
            <TableHead>Groups</TableHead>
            <TableHead>Remarks</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application) => (
            <TableRow key={application.appId}>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getTypeIcon(application.type)}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(application.type)}`}>
                    {application.type}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{application.name}</div>
                  <div className="text-sm text-muted-foreground">ID: {application.appId}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="max-w-xs">
                  <div className="text-sm font-mono truncate">
                    {formatConfig(application.config, application.type)}
                  </div>
                  {application.type === 'REST' && application.config.queryParams && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {Object.keys(application.config.queryParams).length} query params
                    </div>
                  )}
                  {application.type === 'MCP' && application.config.mcpParams && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {Object.keys(application.config.mcpParams).length} MCP params
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="max-w-xs">
                  <div className="text-sm truncate">
                    {getGroupNames(application.groups)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {application.groups.length} group{application.groups.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="max-w-xs">
                  <div className="text-sm truncate" title={application.remarks}>
                    {application.remarks || 'No remarks'}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-muted-foreground">
                  {new Date(application.createdAt).toLocaleDateString()}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onManageGroups(application)}
                    title="Manage group assignments"
                  >
                    👥
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditApplication(application)}
                    title="Edit application"
                  >
                    ✏️
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteApplication(application)}
                    title="Delete application"
                  >
                    🗑️
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};