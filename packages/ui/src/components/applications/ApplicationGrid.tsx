import React, { useState, useEffect, useMemo } from 'react';
import { Application } from '@airium/shared/types';
import { ApplicationCard } from './ApplicationCard';
import { ApplicationFilter } from './ApplicationFilter';
import { ApplicationLauncher } from './ApplicationLauncher';
import { useApplicationAccess } from '../../lib/use-application-access';
import { Card } from '../ui/card';

interface ApplicationGridProps {
  className?: string;
}

export const ApplicationGrid: React.FC<ApplicationGridProps> = ({ className = '' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | 'REST' | 'MCP' | 'INBUILT'>('ALL');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);

  const { 
    applications, 
    loading, 
    error, 
    hasAccess, 
    refreshApplications 
  } = useApplicationAccess();

  // Filter applications based on search term and type
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           app.remarks.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'ALL' || app.type === selectedType;
      return matchesSearch && matchesType && hasAccess(app.appId);
    });
  }, [applications, searchTerm, selectedType, hasAccess]);

  const handleLaunchApplication = (application: Application) => {
    setSelectedApp(application);
    setIsLauncherOpen(true);
  };

  const handleCloseLauncher = () => {
    setIsLauncherOpen(false);
    setSelectedApp(null);
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-red-800">Error Loading Applications</h3>
            <p className="text-red-600">{error}</p>
            <button
              onClick={refreshApplications}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-red-600 text-white hover:bg-red-700 h-10 px-4 py-2"
            >
              Retry
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Available Applications</h2>
          <div className="text-sm text-muted-foreground">
            {filteredApplications.length} of {applications.length} applications
          </div>
        </div>

        <ApplicationFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          applicationCount={filteredApplications.length}
        />
      </div>

      {filteredApplications.length === 0 ? (
        <Card className="p-8">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-muted-foreground">No Applications Found</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm || selectedType !== 'ALL' 
                ? 'Try adjusting your search or filter criteria.'
                : 'No applications are available for your user groups.'}
            </p>
            {(searchTerm || selectedType !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedType('ALL');
                }}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3"
              >
                Clear Filters
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredApplications.map((application) => (
            <ApplicationCard
              key={application.appId}
              application={application}
              onLaunch={handleLaunchApplication}
            />
          ))}
        </div>
      )}

      {selectedApp && (
        <ApplicationLauncher
          application={selectedApp}
          isOpen={isLauncherOpen}
          onClose={handleCloseLauncher}
        />
      )}
    </div>
  );
};