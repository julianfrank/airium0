import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApplicationLauncher } from '../ApplicationLauncher';
import { Application } from '@airium/shared/types';

// Mock window.open and window.location
const mockWindowOpen = vi.fn();
const mockLocationHref = vi.fn();

Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
});

Object.defineProperty(window, 'location', {
  value: {
    set href(value: string) {
      mockLocationHref(value);
    }
  },
  writable: true,
});

const mockRestApplication: Application = {
  PK: 'APP#app1',
  SK: 'METADATA',
  appId: 'app1',
  type: 'REST',
  name: 'Weather API',
  config: {
    url: 'https://api.weather.com',
    queryParams: { key: 'test', format: 'json' }
  },
  remarks: 'Get weather information',
  groups: ['GENERAL'],
  createdAt: '2024-01-01T00:00:00Z'
};

const mockMcpApplication: Application = {
  PK: 'APP#app2',
  SK: 'METADATA',
  appId: 'app2',
  type: 'MCP',
  name: 'File Manager',
  config: {
    transportType: 'websocket',
    mcpParams: { host: 'localhost', port: 8080 }
  },
  remarks: 'Manage files',
  groups: ['ADMIN'],
  createdAt: '2024-01-01T00:00:00Z'
};

const mockInbuiltApplication: Application = {
  PK: 'APP#app3',
  SK: 'METADATA',
  appId: 'app3',
  type: 'INBUILT',
  name: 'Dashboard',
  config: {
    url: '/dashboard'
  },
  remarks: 'User dashboard',
  groups: ['GENERAL'],
  createdAt: '2024-01-01T00:00:00Z'
};

describe('ApplicationLauncher', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockWindowOpen.mockClear();
    mockLocationHref.mockClear();
  });

  it('renders when open', () => {
    render(
      <ApplicationLauncher
        application={mockRestApplication}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    
    expect(screen.getByText('Launch Application')).toBeInTheDocument();
    expect(screen.getByText('Configure and launch "Weather API"')).toBeInTheDocument();
    expect(screen.getByText('Weather API')).toBeInTheDocument();
    expect(screen.getByText('REST')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <ApplicationLauncher
        application={mockRestApplication}
        isOpen={false}
        onClose={mockOnClose}
      />
    );
    
    expect(screen.queryByText('Launch Application')).not.toBeInTheDocument();
  });

  it('displays REST application details correctly', () => {
    render(
      <ApplicationLauncher
        application={mockRestApplication}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    
    expect(screen.getByText('Endpoint URL')).toBeInTheDocument();
    expect(screen.getByText('https://api.weather.com')).toBeInTheDocument();
    expect(screen.getByText('Query Parameters')).toBeInTheDocument();
    expect(screen.getByText('key')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('format')).toBeInTheDocument();
    expect(screen.getByText('json')).toBeInTheDocument();
  });

  it('displays MCP application details correctly', () => {
    render(
      <ApplicationLauncher
        application={mockMcpApplication}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    
    expect(screen.getByText('Transport Type')).toBeInTheDocument();
    expect(screen.getByText('websocket')).toBeInTheDocument();
    expect(screen.getByText('MCP Parameters')).toBeInTheDocument();
    expect(screen.getByText('host')).toBeInTheDocument();
    expect(screen.getByText('localhost')).toBeInTheDocument();
    expect(screen.getByText('port')).toBeInTheDocument();
    expect(screen.getByText('8080')).toBeInTheDocument();
  });

  it('displays INBUILT application details correctly', () => {
    render(
      <ApplicationLauncher
        application={mockInbuiltApplication}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    
    expect(screen.getByText('Internal Route')).toBeInTheDocument();
    expect(screen.getByText('/dashboard')).toBeInTheDocument();
  });

  it('launches REST application with query parameters', async () => {
    render(
      <ApplicationLauncher
        application={mockRestApplication}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    
    const launchButton = screen.getByRole('button', { name: 'Launch' });
    fireEvent.click(launchButton);
    
    await waitFor(() => {
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://api.weather.com/?key=test&format=json',
        '_blank',
        'noopener,noreferrer'
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('launches INBUILT application with internal route', async () => {
    render(
      <ApplicationLauncher
        application={mockInbuiltApplication}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    
    const launchButton = screen.getByRole('button', { name: 'Launch' });
    fireEvent.click(launchButton);
    
    await waitFor(() => {
      expect(mockLocationHref).toHaveBeenCalledWith('/dashboard');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('shows MCP application placeholder for launch', async () => {
    // Mock window.alert
    const mockAlert = vi.fn();
    window.alert = mockAlert;
    
    render(
      <ApplicationLauncher
        application={mockMcpApplication}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    
    const launchButton = screen.getByRole('button', { name: 'Launch' });
    fireEvent.click(launchButton);
    
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('MCP Application "File Manager" integration coming soon!');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('shows loading state during launch', async () => {
    render(
      <ApplicationLauncher
        application={mockRestApplication}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    
    const launchButton = screen.getByRole('button', { name: 'Launch' });
    fireEvent.click(launchButton);
    
    // Should show loading state briefly
    expect(screen.getByText('Launching...')).toBeInTheDocument();
    expect(launchButton).toBeDisabled();
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('disables buttons during launch', async () => {
    render(
      <ApplicationLauncher
        application={mockRestApplication}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    
    const launchButton = screen.getByRole('button', { name: 'Launch' });
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    
    fireEvent.click(launchButton);
    
    expect(launchButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('closes when cancel button is clicked', () => {
    render(
      <ApplicationLauncher
        application={mockRestApplication}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles REST application without URL', async () => {
    const appWithoutUrl = {
      ...mockRestApplication,
      config: { queryParams: { key: 'test' } }
    };
    
    // Mock console.error to check error handling
    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <ApplicationLauncher
        application={appWithoutUrl}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    
    const launchButton = screen.getByRole('button', { name: 'Launch' });
    fireEvent.click(launchButton);
    
    await waitFor(() => {
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to launch application:',
        expect.any(Error)
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
    
    mockConsoleError.mockRestore();
  });

  it('handles INBUILT application with external URL', async () => {
    const appWithExternalUrl = {
      ...mockInbuiltApplication,
      config: { url: 'https://external.example.com' }
    };
    
    render(
      <ApplicationLauncher
        application={appWithExternalUrl}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    
    const launchButton = screen.getByRole('button', { name: 'Launch' });
    fireEvent.click(launchButton);
    
    await waitFor(() => {
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://external.example.com',
        '_blank',
        'noopener,noreferrer'
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('displays application remarks when available', () => {
    render(
      <ApplicationLauncher
        application={mockRestApplication}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    
    expect(screen.getByText('Get weather information')).toBeInTheDocument();
  });

  it('handles application without remarks', () => {
    const appWithoutRemarks = {
      ...mockRestApplication,
      remarks: ''
    };
    
    render(
      <ApplicationLauncher
        application={appWithoutRemarks}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    
    expect(screen.queryByText('Get weather information')).not.toBeInTheDocument();
  });
});