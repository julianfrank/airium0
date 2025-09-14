import React from 'react';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Group } from '../../../../shared/src/types/auth';

interface GroupTableProps {
  groups: Group[];
  onEditGroup: (group: Group) => void;
  onDeleteGroup: (group: Group) => void;
}

export const GroupTable: React.FC<GroupTableProps> = ({
  groups,
  onEditGroup,
  onDeleteGroup
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  if (groups.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No groups found</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Applications</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((group) => (
          <TableRow key={group.groupId}>
            <TableCell className="font-medium">
              {group.name}
            </TableCell>
            <TableCell>
              <div className="max-w-xs">
                <span className="text-sm text-muted-foreground" title={group.description}>
                  {truncateText(group.description)}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <div className="max-w-xs">
                <span className="text-sm text-muted-foreground">
                  {group.applications.length > 0 
                    ? `${group.applications.length} application${group.applications.length !== 1 ? 's' : ''}`
                    : 'No applications'
                  }
                </span>
              </div>
            </TableCell>
            <TableCell>
              <span className="text-sm text-muted-foreground">
                {formatDate(group.createdAt)}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditGroup(group)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDeleteGroup(group)}
                  disabled={group.groupId === 'admin' || group.groupId === 'general'}
                  title={
                    group.groupId === 'admin' || group.groupId === 'general'
                      ? 'System groups cannot be deleted'
                      : 'Delete group'
                  }
                >
                  Delete
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};