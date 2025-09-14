import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ApplicationManagement } from '../ApplicationManagement';

describe('ApplicationManagement', () => {
  it('renders application management interface', () => {
    render(<ApplicationManagement />);
    
    expect(screen.getByText('Application Management')).toBeInTheDocument();
    expect(screen.getByText('Manage REST, MCP, and inbuilt applications and their group assignments')).toBeInTheDocument();
    expect(screen.getByText('Add Application')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<ApplicationManagement />);
    
    expect(screen.getByText('Loading applications...')).toBeInTheDocument();
  });
});