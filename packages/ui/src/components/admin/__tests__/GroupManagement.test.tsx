import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GroupManagement } from '../GroupManagement';

// Mock the shared types
vi.mock('@airium/shared', () => ({
  Group: {}
}));

describe('GroupManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<GroupManagement />);
    expect(screen.getByText('Loading groups...')).toBeInTheDocument();
  });

  it('renders group management interface after loading', async () => {
    render(<GroupManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('Group Management')).toBeInTheDocument();
      expect(screen.getByText('Manage user groups and their application access permissions')).toBeInTheDocument();
      expect(screen.getByText('Add Group')).toBeInTheDocument();
    });
  });

  it('displays mock groups in table', async () => {
    render(<GroupManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('Administrators')).toBeInTheDocument();
      expect(screen.getByText('General Users')).toBeInTheDocument();
      expect(screen.getByText('Developers')).toBeInTheDocument();
      expect(screen.getByText('Managers')).toBeInTheDocument();
    });
  });

  it('opens create group dialog when Add Group button is clicked', async () => {
    render(<GroupManagement />);
    
    await waitFor(() => {
      const addButton = screen.getByText('Add Group');
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Create New Group')).toBeInTheDocument();
    });
  });

  it('opens edit dialog when edit button is clicked', async () => {
    render(<GroupManagement />);
    
    await waitFor(() => {
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Group')).toBeInTheDocument();
    });
  });

  it('shows system group protection for admin and general groups', async () => {
    render(<GroupManagement />);
    
    await waitFor(() => {
      const deleteButtons = screen.getAllByText('Delete');
      // Admin and general group delete buttons should be disabled
      expect(deleteButtons[0]).toBeDisabled();
      expect(deleteButtons[1]).toBeDisabled();
    });
  });

  it('allows deletion of custom groups', async () => {
    render(<GroupManagement />);
    
    await waitFor(() => {
      const deleteButtons = screen.getAllByText('Delete');
      // Developers group (3rd in list) should be deletable
      expect(deleteButtons[2]).not.toBeDisabled();
      fireEvent.click(deleteButtons[2]);
    });

    await waitFor(() => {
      expect(screen.getByText('Delete Group')).toBeInTheDocument();
    });
  });

  it('handles group creation', async () => {
    render(<GroupManagement />);
    
    await waitFor(() => {
      const addButton = screen.getByText('Add Group');
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('e.g., Marketing Team');
      fireEvent.change(nameInput, { target: { value: 'Test Group' } });
      
      const descriptionInput = screen.getByPlaceholderText('Describe the purpose and scope of this group...');
      fireEvent.change(descriptionInput, { target: { value: 'This is a test group for testing purposes' } });
      
      const createButton = screen.getByText('Create Group');
      fireEvent.click(createButton);
    });

    // The dialog should close after successful creation
    await waitFor(() => {
      expect(screen.queryByText('Create New Group')).not.toBeInTheDocument();
    });
  });

  it('displays application count for each group', async () => {
    render(<GroupManagement />);
    
    await waitFor(() => {
      // Check that application counts are displayed
      const applicationCells = screen.getAllByText(/\d+ applications?/);
      expect(applicationCells.length).toBeGreaterThan(0);
    });
  });
});