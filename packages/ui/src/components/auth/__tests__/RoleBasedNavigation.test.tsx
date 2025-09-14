import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoleBasedNavigation } from '../RoleBasedNavigation';

// Mock the useAuth hook
vi.mock('../AuthProvider', () => ({
  useAuth: vi.fn()
}));

const mockUseAuth = vi.mocked(await import('../AuthProvider')).useAuth;

describe('RoleBasedNavigation', () => {
  it('renders nothing when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      error: null
    });

    const { container } = render(<RoleBasedNavigation />);
    expect(container.firstChild).toBeNull();
  });

  it('shows general user navigation items', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'user@example.com',
        profile: 'GENERAL',
        groups: ['general']
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      error: null
    });

    render(<RoleBasedNavigation />);

    // General users should see these items
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Chat Interface')).toBeInTheDocument();
    expect(screen.getByText('Voice Chat')).toBeInTheDocument();
    expect(screen.getByText('Media Upload')).toBeInTheDocument();

    // General users should NOT see admin items
    expect(screen.queryByText('User Management')).not.toBeInTheDocument();
    expect(screen.queryByText('Applications')).not.toBeInTheDocument();
  });

  it('shows admin navigation items', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'admin@example.com',
        profile: 'ADMIN',
        groups: ['admin']
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      error: null
    });

    render(<RoleBasedNavigation />);

    // Admin users should see all items
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Applications')).toBeInTheDocument();
    expect(screen.getByText('Chat Interface')).toBeInTheDocument();
    expect(screen.getByText('Voice Chat')).toBeInTheDocument();
    expect(screen.getByText('Media Upload')).toBeInTheDocument();
  });

  it('calls onNavigate when navigation item is clicked', () => {
    const mockOnNavigate = vi.fn();
    
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'user@example.com',
        profile: 'GENERAL',
        groups: ['general']
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      error: null
    });

    render(<RoleBasedNavigation onNavigate={mockOnNavigate} />);

    fireEvent.click(screen.getByText('Dashboard'));
    expect(mockOnNavigate).toHaveBeenCalledWith('/');
  });

  it('renders horizontal layout correctly', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'user@example.com',
        profile: 'GENERAL',
        groups: ['general']
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      error: null
    });

    render(<RoleBasedNavigation orientation="horizontal" />);

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('flex', 'items-center', 'space-x-2');
  });

  it('renders vertical layout by default', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'user@example.com',
        profile: 'GENERAL',
        groups: ['general']
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      error: null
    });

    render(<RoleBasedNavigation />);

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('flex', 'flex-col', 'space-y-1');
  });

  it('applies custom className', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'user@example.com',
        profile: 'GENERAL',
        groups: ['general']
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      error: null
    });

    render(<RoleBasedNavigation className="custom-class" />);

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('custom-class');
  });
});