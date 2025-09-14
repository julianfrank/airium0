import React from 'react';
import { Application } from '@airium/shared/types';
import { Card } from '../ui/card';

interface ApplicationCardProps {
  application: Application;
  onLaunch: (application: Application) => void;
}

const getApplicationIcon = (type: Application['type']) => {
  switch (type) {
    case 'REST':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
        </svg>
      );
    case 'MCP':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      );
    case 'INBUILT':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      );
    default:
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

const getTypeColor = (type: Application['type']) => {
  switch (type) {
    case 'REST':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'MCP':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'INBUILT':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const ApplicationCard: React.FC<ApplicationCardProps> = ({ 
  application, 
  onLaunch 
}) => {
  const handleLaunch = () => {
    onLaunch(application);
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/20">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getTypeColor(application.type)}`}>
              {getApplicationIcon(application.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                {application.name}
              </h3>
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(application.type)}`}>
                {application.type}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {application.remarks && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {application.remarks}
            </p>
          )}

          {application.config.url && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">URL:</span> 
              <span className="ml-1 font-mono truncate block">
                {application.config.url}
              </span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t">
          <button
            onClick={handleLaunch}
            className="w-full h-8 text-xs inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Launch Application
          </button>
        </div>
      </div>
    </Card>
  );
};