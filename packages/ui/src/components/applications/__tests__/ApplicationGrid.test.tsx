import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApplicationGrid } from '../ApplicationGrid';
import { Application } from '@airium/shared/types';

// Mock the useApplicationAccess hook
vi.mock('../../../lib/use-application-access', () => ({
  useApplicationAccess: vi.fn(),
}));

const mockApplications: Application[] = [
  {
    PK: 'APP#app1',
    SK: 'METADATA',
    appId: 'app1',
    type: 'REST',
    name: 'Weather API',
    config: {
      url: 'https://api.weather.com',
      queryParams: { key: 'test' }
    },
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
    config: {
      transportType: 'websocket',
      mcpParams: { host: 'localhost', port: 8080 }
    },
    remarks: 'Manage files and directories',
    groups: ['ADMIN'],
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    PK: 'APP#app3',
    SK: 'METADATA',
    appId: 'app3',
    type: 'INBUILT',
    name: 'Dashboard',
    config: {
      url: '/dashboard'
    },
    remarks: 'User dashboard',
    groups: ['GENERAL', 'ADMIN'],
    createdAt: '2024-01-01T00:00:00Z'
  }
];

describe('ApplicationGrid', () => {
  const mockUseApplicationAccess = vi.mocked(
    require('../../../lib/use-application-access').useApplicationAccess
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseApplicationAccess.mockReturnValue({
      applications: [],
      loading: true,
      error: null,
      hasAccess: vi.fn(),
      refreshApplications: vi.fn(),
    });

    render(<ApplicationGrid />);
    
    expect(screen.getByText('Available Applications')).toBeInTheDocument();
    // Check for loading skeleton
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders error state with retry button', async () => {
    const mockRefresh = vi.fn();
    mockUseApplicationAccess.mockReturnValue({
      applications: [],
      loading: false,
      error: 'Failed to load applications',
      hasAccess: vi.fn(),
      refreshApplications: mockRefresh,
    });

    render(<ApplicationGrid />);
    
    expect(screen.getByText('Error Loading Applications')).toBeInTheDocument();
    expect(screen.getByText('Failed to load applications')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders applications with access control', () => {
    const mockHasAccess = vi.fn((appId: string) => {
      // User has access to app1 and app3, but not app2
      return appId === 'app1' || appId === 'app3';
    });

    mockUseApplicationAccess.mockReturnValue({
      applications: mockApplications,
      loading: false,
      error: null,
      hasAccess: mockHasAccess,
      refreshApplications: vi.fn(),
    });

    render(<ApplicationGrid />);
    
    // Should show applications the user has access to
    expect(screen.getByText('Weather API')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    
    // Should not show applications the user doesn't have access to
    expect(screen.queryByText('File Manager')).not.toBeInTheDocument();
    
    // Should show correct count
    expect(screen.getByText('2 of 3 applications')).toBeInTheDocument();
  });

  it('filters applications by search term', async () => {
    const mockHasAccess = vi.fn(() => true);

    mockUseApplicationAccess.mockReturnValue({
      applications: mockApplications,
      loading: false,
      error: null,
      hasAccess: mockHasAccess,
      refreshApplications: vi.fn(),
    });

    render(<ApplicationGrid />);
    
    const searchInput = screen.getByPlaceholderText('Search applications...');
    
    // Search for "weather"
    fireEvent.change(searchInput, { target: { value: 'weather' } });
    
    await waitFor(() => {
      expect(screen.getByText('Weather API')).toBeInTheDocument();
      expect(screen.queryByText('File Manager')).not.toBeInTheDocument();
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });
  });

  it('filters applications by type', async () => {
    const mockHasAccess = vi.fn(() => true);

    mockUseApplicationAccess.mockReturnValue({
      applications: mockApplications,
      loading: false,
      error: null,
      hasAccess: mockHasAccess,
      refreshApplications: vi.fn(),
    });

    render(<ApplicationGrid />);
    
    const typeSelect = screen.getByDisplayValue('All Types');
    
    // Filter by REST type
    fireEvent.change(typeSelect, { target: { value: 'REST' } });
    
    await waitFor(() => {
      expect(screen.getByText('Weather API')).toBeInTheDocument();
      expect(screen.queryByText('File Manager')).not.toBeInTheDocument();
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });
  });

  it('shows no applications message when filtered results are empty', () => {
    const mockHasAccess = vi.fn(() => false); // No access to any apps

    mockUseApplicationAccess.mockReturnValue({
      applications: mockApplications,
      loading: false,
      error: null,
      hasAccess: mockHasAccess,
      refreshApplications: vi.fn(),
    });

    render(<ApplicationGrid />);
    
    expect(screen.getByText('No Applications Found')).toBeInTheDocument();
    expect(screen.getByText('No applications are available for your user groups.')).toBeInTheDocument();
  });

  it('clears filters when clear button is clicked', async () => {
    const mockHasAccess = vi.fn(() => true);

    mockUseApplicationAccess.mockReturnValue({
      applications: mockApplications,
      loading: false,
      error: null,
      hasAccess: mockHasAccess,
      refreshApplications: vi.fn(),
    });

    render(<ApplicationGrid />);
    
    const searchInput = screen.getByPlaceholderText('Search applications...');
    
    // Apply search filter
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    await waitFor(() => {
      expect(screen.getByText('No Applications Found')).toBeInTheDocument();
    });
    
    // Click clear filters
    const clearButton = screen.getByText('Clear Filters');
    fireEvent.click(clearButton);
    
    await waitFor(() => {
      expect(searchInput).toHaveValue('');
      expect(screen.getByText('Weather API')).toBeInTheDocument();
    });
  });

  it('opens application launcher when launch button is clicked', async () => {
    const mockHasAccess = vi.fn(() => true);

    mockUseApplicationAccess.mockReturnValue({
      applications: mockApplications,
      loading: false,
      error: null,
      hasAccess: mockHasAccess,
      refreshApplications: vi.fn(),
    });

    render(<ApplicationGrid />);
    
    const launchButtons = screen.getAllByText('Launch Application');
    fireEvent.click(launchButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Launch Application')).toBeInTheDocument();
      expect(screen.getByText('Configure and launch "Weather API"')).toBeInTheDocument();
    });
  });
});