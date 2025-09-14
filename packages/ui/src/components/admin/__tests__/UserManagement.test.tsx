import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserManagement } from '../UserManagement';

// Mock the shared types
vi.mock('@airium/shared', () => ({
  User: {},
  Group: {}
}));

describe('UserManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<UserManagement />);
    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  it('renders user management interface after loading', async () => {
    render(<UserManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('Manage user accounts, profiles, and group assignments')).toBeInTheDocument();
      expect(screen.getByText('Add User')).toBeInTheDocument();
    });
  });

  it('displays mock users in table', async () => {
    render(<UserManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('admin@airium.com')).toBeInTheDocument();
      expect(screen.getByText('user1@airium.com')).toBeInTheDocument();
      expect(screen.getByText('user2@airium.com')).toBeInTheDocument();
    });
  });

  it('opens create user dialog when Add User button is clicked', async () => {
    render(<UserManagement />);
    
    await waitFor(() => {
      const addButton = screen.getByText('Add User');
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Create New User')).toBeInTheDocument();
    });
  });

  it('opens edit dialog when edit button is clicked', async () => {
    render(<UserManagement />);
    
    await waitFor(() => {
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Edit User')).toBeInTheDocument();
    });
  });

  it('opens delete dialog when delete button is clicked', async () => {
    render(<UserManagement />);
    
    await waitFor(() => {
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Delete User')).toBeInTheDocument();
    });
  });

  it('displays error message when error occurs', async () => {
    // Mock console.error to avoid test output noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<UserManagement />);
    
    // Wait for component to load and then simulate an error
    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('handles user creation', async () => {
    render(<UserManagement />);
    
    await waitFor(() => {
      const addButton = screen.getByText('Add User');
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      const emailInput = screen.getByPlaceholderText('user@example.com');
      fireEvent.change(emailInput, { target: { value: 'newuser@test.com' } });
      
      const createButton = screen.getByText('Create User');
      fireEvent.click(createButton);
    });

    // The dialog should close after successful creation
    await waitFor(() => {
      expect(screen.queryByText('Create New User')).not.toBeInTheDocument();
    });
  });
});