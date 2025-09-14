import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ApplicationCard } from '../ApplicationCard';
import { Application } from '@airium/shared';

const mockRestApplication: Application = {
  PK: 'APP#app1',
  SK: 'METADATA',
  appId: 'app1',
  type: 'REST',
  name: 'Weather API',
  config: {
    url: 'https://api.weather.com',
    queryParams: { key: 'test' }
  },
  remarks: 'Get weather information for any location',
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
  remarks: 'Manage files and directories',
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
  remarks: 'User dashboard and overview',
  groups: ['GENERAL', 'ADMIN'],
  createdAt: '2024-01-01T00:00:00Z'
};

describe('ApplicationCard', () => {
  const mockOnLaunch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders REST application correctly', () => {
    render(<ApplicationCard application={mockRestApplication} onLaunch={mockOnLaunch} />);
    
    expect(screen.getByText('Weather API')).toBeInTheDocument();
    expect(screen.getByText('REST')).toBeInTheDocument();
    expect(screen.getByText('Get weather information for any location')).toBeInTheDocument();
    expect(screen.getByText('https://api.weather.com')).toBeInTheDocument();
    expect(screen.getByText('Launch Application')).toBeInTheDocument();
  });

  it('renders MCP application correctly', () => {
    render(<ApplicationCard application={mockMcpApplication} onLaunch={mockOnLaunch} />);
    
    expect(screen.getByText('File Manager')).toBeInTheDocument();
    expect(screen.getByText('MCP')).toBeInTheDocument();
    expect(screen.getByText('Manage files and directories')).toBeInTheDocument();
    expect(screen.getByText('Launch Application')).toBeInTheDocument();
  });

  it('renders INBUILT application correctly', () => {
    render(<ApplicationCard application={mockInbuiltApplication} onLaunch={mockOnLaunch} />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('INBUILT')).toBeInTheDocument();
    expect(screen.getByText('User dashboard and overview')).toBeInTheDocument();
    expect(screen.getByText('/dashboard')).toBeInTheDocument();
    expect(screen.getByText('Launch Application')).toBeInTheDocument();
  });

  it('applies correct styling for different application types', () => {
    const { rerender } = render(<ApplicationCard application={mockRestApplication} onLaunch={mockOnLaunch} />);
    
    // REST application should have blue styling
    let typeElement = screen.getByText('REST');
    expect(typeElement).toHaveClass('bg-blue-100', 'text-blue-800', 'border-blue-200');
    
    // MCP application should have green styling
    rerender(<ApplicationCard application={mockMcpApplication} onLaunch={mockOnLaunch} />);
    typeElement = screen.getByText('MCP');
    expect(typeElement).toHaveClass('bg-green-100', 'text-green-800', 'border-green-200');
    
    // INBUILT application should have purple styling
    rerender(<ApplicationCard application={mockInbuiltApplication} onLaunch={mockOnLaunch} />);
    typeElement = screen.getByText('INBUILT');
    expect(typeElement).toHaveClass('bg-purple-100', 'text-purple-800', 'border-purple-200');
  });

  it('calls onLaunch when launch button is clicked', () => {
    render(<ApplicationCard application={mockRestApplication} onLaunch={mockOnLaunch} />);
    
    const launchButton = screen.getByText('Launch Application');
    fireEvent.click(launchButton);
    
    expect(mockOnLaunch).toHaveBeenCalledTimes(1);
    expect(mockOnLaunch).toHaveBeenCalledWith(mockRestApplication);
  });

  it('handles application without remarks', () => {
    const appWithoutRemarks = {
      ...mockRestApplication,
      remarks: ''
    };
    
    render(<ApplicationCard application={appWithoutRemarks} onLaunch={mockOnLaunch} />);
    
    expect(screen.getByText('Weather API')).toBeInTheDocument();
    expect(screen.getByText('REST')).toBeInTheDocument();
    // Remarks section should not be rendered
    expect(screen.queryByText('Get weather information for any location')).not.toBeInTheDocument();
  });

  it('handles application without URL', () => {
    const appWithoutUrl = {
      ...mockRestApplication,
      config: {
        queryParams: { key: 'test' }
      }
    };
    
    render(<ApplicationCard application={appWithoutUrl} onLaunch={mockOnLaunch} />);
    
    expect(screen.getByText('Weather API')).toBeInTheDocument();
    // URL section should not be rendered
    expect(screen.queryByText('URL:')).not.toBeInTheDocument();
  });

  it('truncates long application names', () => {
    const appWithLongName = {
      ...mockRestApplication,
      name: 'This is a very long application name that should be truncated'
    };
    
    render(<ApplicationCard application={appWithLongName} onLaunch={mockOnLaunch} />);
    
    const nameElement = screen.getByText(appWithLongName.name);
    expect(nameElement).toHaveClass('truncate');
  });

  it('shows hover effects on card', () => {
    render(<ApplicationCard application={mockRestApplication} onLaunch={mockOnLaunch} />);
    
    const card = screen.getByText('Weather API').closest('.group');
    expect(card).toHaveClass('hover:shadow-lg', 'transition-all', 'duration-200', 'cursor-pointer', 'hover:border-primary/20');
  });

  it('renders correct icons for different application types', () => {
    const { rerender } = render(<ApplicationCard application={mockRestApplication} onLaunch={mockOnLaunch} />);
    
    // Check that SVG icons are rendered (we can't easily test the specific icon content)
    let iconContainer = screen.getByText('REST').parentElement?.querySelector('svg');
    expect(iconContainer).toBeInTheDocument();
    
    rerender(<ApplicationCard application={mockMcpApplication} onLaunch={mockOnLaunch} />);
    iconContainer = screen.getByText('MCP').parentElement?.querySelector('svg');
    expect(iconContainer).toBeInTheDocument();
    
    rerender(<ApplicationCard application={mockInbuiltApplication} onLaunch={mockOnLaunch} />);
    iconContainer = screen.getByText('INBUILT').parentElement?.querySelector('svg');
    expect(iconContainer).toBeInTheDocument();
  });
});