import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminDashboard } from '../AdminDashboard';

// Mock the child components
vi.mock('../UserManagement', () => ({
  UserManagement: () => <div data-testid="user-management">User Management Component</div>
}));

vi.mock('../GroupManagement', () => ({
  GroupManagement: () => <div data-testid="group-management">Group Management Component</div>
}));

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders overview tab by default', () => {
    render(<AdminDashboard />);
    
    expect(screen.getByText('📊 Overview')).toBeInTheDocument();
    expect(screen.getByText('👥 Users')).toBeInTheDocument();
    expect(screen.getByText('🏷️ Groups')).toBeInTheDocument();
    
    // Should show overview content
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Active Groups')).toBeInTheDocument();
    expect(screen.getByText('Applications')).toBeInTheDocument();
    expect(screen.getByText('Active Sessions')).toBeInTheDocument();
  });

  it('displays quick stats cards', () => {
    render(<AdminDashboard />);
    
    expect(screen.getByText('12')).toBeInTheDocument(); // Total Users
    expect(screen.getByText('5')).toBeInTheDocument();  // Active Groups
    expect(screen.getByText('8')).toBeInTheDocument();  // Applications
    expect(screen.getByText('24')).toBeInTheDocument(); // Active Sessions
  });

  it('shows quick action cards', () => {
    render(<AdminDashboard />);
    
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Group Management')).toBeInTheDocument();
    expect(screen.getByText('Manage user accounts, profiles, and group assignments')).toBeInTheDocument();
    expect(screen.getByText('Manage user groups and their application access permissions')).toBeInTheDocument();
  });

  it('displays system status indicators', () => {
    render(<AdminDashboard />);
    
    expect(screen.getByText('System Status')).toBeInTheDocument();
    expect(screen.getByText('Authentication Service')).toBeInTheDocument();
    expect(screen.getByText('Database Connection')).toBeInTheDocument();
    expect(screen.getByText('AI Services')).toBeInTheDocument();
    expect(screen.getByText('WebSocket API')).toBeInTheDocument();
    expect(screen.getByText('Media Storage')).toBeInTheDocument();
    expect(screen.getByText('Nova Sonic Integration')).toBeInTheDocument();
  });

  it('switches to users tab when users tab is clicked', async () => {
    render(<AdminDashboard />);
    
    const usersTab = screen.getByText('👥 Users');
    fireEvent.click(usersTab);
    
    await waitFor(() => {
      expect(screen.getByTestId('user-management')).toBeInTheDocument();
      expect(screen.queryByText('Total Users')).not.toBeInTheDocument(); // Overview content should be hidden
    });
  });

  it('switches to groups tab when groups tab is clicked', async () => {
    render(<AdminDashboard />);
    
    const groupsTab = screen.getByText('🏷️ Groups');
    fireEvent.click(groupsTab);
    
    await waitFor(() => {
      expect(screen.getByTestId('group-management')).toBeInTheDocument();
      expect(screen.queryByText('Total Users')).not.toBeInTheDocument(); // Overview content should be hidden
    });
  });

  it('switches back to overview tab', async () => {
    render(<AdminDashboard />);
    
    // Switch to users tab first
    const usersTab = screen.getByText('👥 Users');
    fireEvent.click(usersTab);
    
    await waitFor(() => {
      expect(screen.getByTestId('user-management')).toBeInTheDocument();
    });
    
    // Switch back to overview
    const overviewTab = screen.getByText('📊 Overview');
    fireEvent.click(overviewTab);
    
    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.queryByTestId('user-management')).not.toBeInTheDocument();
    });
  });

  it('navigates to users tab from quick action button', async () => {
    render(<AdminDashboard />);
    
    const manageUsersButton = screen.getByText('Manage Users');
    fireEvent.click(manageUsersButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('user-management')).toBeInTheDocument();
    });
  });

  it('navigates to groups tab from quick action button', async () => {
    render(<AdminDashboard />);
    
    const manageGroupsButton = screen.getByText('Manage Groups');
    fireEvent.click(manageGroupsButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('group-management')).toBeInTheDocument();
    });
  });

  it('applies custom className when provided', () => {
    const { container } = render(<AdminDashboard className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});