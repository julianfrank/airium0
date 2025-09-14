import { useState, useEffect, useCallback } from 'react';
import { Application } from '@airium/shared/types';
import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';

interface UseApplicationAccessReturn {
  applications: Application[];
  loading: boolean;
  error: string | null;
  hasAccess: (appId: string) => boolean;
  refreshApplications: () => Promise<void>;
}

export const useApplicationAccess = (): UseApplicationAccessReturn => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userGroups, setUserGroups] = useState<string[]>([]);

  const client = generateClient();

  const fetchUserGroups = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      const groups = user.signInUserSession?.accessToken?.payload['cognito:groups'] || [];
      setUserGroups(Array.isArray(groups) ? groups : []);
    } catch (err) {
      console.error('Failed to fetch user groups:', err);
      setUserGroups([]);
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch applications for user's groups
      const promises = userGroups.map(async (groupId) => {
        try {
          const response = await fetch(`/api/applications?groupId=${encodeURIComponent(groupId)}`, {
            headers: {
              'Authorization': `Bearer ${(await getCurrentUser()).signInUserSession?.accessToken?.jwtToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch applications for group ${groupId}`);
          }

          const data = await response.json();
          return data.applications || [];
        } catch (err) {
          console.error(`Error fetching applications for group ${groupId}:`, err);
          return [];
        }
      });

      const results = await Promise.all(promises);
      
      // Flatten and deduplicate applications
      const allApps = results.flat();
      const uniqueApps = allApps.reduce((acc, app) => {
        if (!acc.find(existing => existing.appId === app.appId)) {
          acc.push(app);
        }
        return acc;
      }, [] as Application[]);

      setApplications(uniqueApps);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [userGroups]);

  const hasAccess = useCallback((appId: string): boolean => {
    const app = applications.find(a => a.appId === appId);
    if (!app) return false;

    // Check if user has any group that has access to this application
    return app.groups.some(appGroup => userGroups.includes(appGroup));
  }, [applications, userGroups]);

  const refreshApplications = useCallback(async () => {
    await fetchUserGroups();
    await fetchApplications();
  }, [fetchUserGroups, fetchApplications]);

  useEffect(() => {
    fetchUserGroups();
  }, [fetchUserGroups]);

  useEffect(() => {
    if (userGroups.length > 0) {
      fetchApplications();
    } else {
      setLoading(false);
    }
  }, [userGroups, fetchApplications]);

  return {
    applications,
    loading,
    error,
    hasAccess,
    refreshApplications,
  };
};