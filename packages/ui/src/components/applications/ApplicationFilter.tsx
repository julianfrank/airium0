import React from 'react';
import { Input } from '../ui/input';

interface ApplicationFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedType: 'ALL' | 'REST' | 'MCP' | 'INBUILT';
  onTypeChange: (type: 'ALL' | 'REST' | 'MCP' | 'INBUILT') => void;
  applicationCount: number;
}

export const ApplicationFilter: React.FC<ApplicationFilterProps> = ({
  searchTerm,
  onSearchChange,
  selectedType,
  onTypeChange,
  applicationCount
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-md">
        <div className="relative flex-1">
          <svg 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            type="text"
            placeholder="Search applications..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => onTypeChange(e.target.value as 'ALL' | 'REST' | 'MCP' | 'INBUILT')}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="ALL">All Types</option>
          <option value="REST">REST APIs</option>
          <option value="MCP">MCP Tools</option>
          <option value="INBUILT">Built-in Apps</option>
        </select>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="hidden sm:inline">Showing</span>
        <span className="font-medium">{applicationCount}</span>
        <span>application{applicationCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
};