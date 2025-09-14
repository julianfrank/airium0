import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useApplicationAccess } from '../use-application-access';
import { Application } from '@airium/shared/types';
import { getCurrentUser } from 'aws-amplify/auth';

// Mock AWS Amplify
vi.mock('aws-amplify/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('aws-amplify/api', () => ({
  generateClient: vi.fn(() => ({})),
}));

// Mock fetch
global.fetch = vi.fn();

const mockApplications: Application[] = [
  {
    PK: 'APP#app1',
    SK: 'METADATA',
    appId: 'app1',
    type: 'REST',
    name: 'Weather API',
    config: { url: 'https://api.weather.com' },
    remarks: 'Get weather information',
    groups: ['GENERAL'],
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    PK: 'APP#app2',
    SK: 'METADATA',
    appId: 'app2',
    type: 'MCP',
    name: 'File Manager',
    config: { transportType: 'websocket' },
    remarks: 'Manage files',
    groups: ['ADMIN'],
    createdAt: '2024-01-01T00:00:00Z'
  }
];

describe('useApplicationAccess', () => {
  const mockGetCurrentUser = vi.mocked(getCurrentUser);

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock for getCurrentUser
    mockGetCurrentUser.mockResolvedValue({
      signInUserSession: {
        accessToken: {
          payload: {
            'cognito:groups': ['GENERAL']
          },
          jwtToken: 'mock-jwt-token'
        }
      }
    });
  });

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useApplicationAccess());
    
    expect(result.current.loading).toBe(true);
    expect(result.current.applications).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('fetches applications for user groups', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ applications: [mockApplications[0]] })
    } as Response);

    const { result } = renderHook(() => useApplicationAccess());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.applications).toHaveLength(1);
    expect(result.current.applications[0].name).toBe('Weather API');
    expect(result.current.error).toBe(null);
  });

  it('handles multiple user groups', async () => {
    // User has both GENERAL and ADMIN groups
    mockGetCurrentUser.mockResolvedValue({
      signInUserSession: {
        accessToken: {
          payload: {
            'cognito:groups': ['GENERAL', 'ADMIN']
          },
          jwtToken: 'mock-jwt-token'
        }
      }
    });

    // Mock responses for both groups
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ applications: [mockApplications[0]] })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ applications: [mockApplications[1]] })
      } as Response);

    const { result } = renderHook(() => useApplicationAccess());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.applications).toHaveLength(2);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('deduplicates applications from multiple groups', async () => {
    mockGetCurrentUser.mockResolvedValue({
      signInUserSession: {
        accessToken: {
          payload: {
            'cognito:groups': ['GENERAL', 'ADMIN']
          },
          jwtToken: 'mock-jwt-token'
        }
      }
    });

    // Both groups return the same application
    const duplicateApp = mockApplications[0];
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ applications: [duplicateApp] })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ applications: [duplicateApp] })
      } as Response);

    const { result } = renderHook(() => useApplicationAccess());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Should only have one instance of the application
    expect(result.current.applications).toHaveLength(1);
    expect(result.current.applications[0].appId).toBe(duplicateApp.appId);
  });

  it('checks access permissions correctly', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ applications: mockApplications })
    } as Response);

    const { result } = renderHook(() => useApplicationAccess());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // User is in GENERAL group
    expect(result.current.hasAccess('app1')).toBe(true);  // Weather API is in GENERAL group
    expect(result.current.hasAccess('app2')).toBe(false); // File Manager is in ADMIN group only
    expect(result.current.hasAccess('nonexistent')).toBe(false); // Non-existent app
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useApplicationAccess());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.error).toBe('Network error');
    expect(result.current.applications).toEqual([]);
  });

  it('handles authentication errors', async () => {
    mockGetCurrentUser.mockRejectedValueOnce(new Error('Not authenticated'));

    const { result } = renderHook(() => useApplicationAccess());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Should handle gracefully with empty groups
    expect(result.current.applications).toEqual([]);
  });

  it('refreshes applications when called', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ applications: [mockApplications[0]] })
    } as Response);

    const { result } = renderHook(() => useApplicationAccess());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Clear the mock call count
    vi.mocked(global.fetch).mockClear();
    
    // Call refresh
    await result.current.refreshApplications();
    
    // Should fetch again
    expect(global.fetch).toHaveBeenCalled();
  });

  it('handles empty user groups', async () => {
    mockGetCurrentUser.mockResolvedValue({
      signInUserSession: {
        accessToken: {
          payload: {
            'cognito:groups': []
          },
          jwtToken: 'mock-jwt-token'
        }
      }
    });

    const { result } = renderHook(() => useApplicationAccess());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.applications).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('handles missing cognito groups in token', async () => {
    mockGetCurrentUser.mockResolvedValue({
      signInUserSession: {
        accessToken: {
          payload: {}, // No cognito:groups
          jwtToken: 'mock-jwt-token'
        }
      }
    });

    const { result } = renderHook(() => useApplicationAccess());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.applications).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});