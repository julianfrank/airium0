import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from '../ProtectedRoute';
import { AuthProvider } from '../AuthProvider';

// Mock the useAuth hook
vi.mock('../AuthProvider', async () => {
  const actual = await vi.importActual('../AuthProvider');
  return {
    ...actual,
    useAuth: vi.fn()
  };
});

const mockUseAuth = vi.mocked(await import('../AuthProvider')).useAuth;

const TestContent = () => <div data-testid="protected-content">Protected Content</div>;

describe('ProtectedRoute', () => {
  it('shows loading state when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      error: null
    });

    render(
      <ProtectedRoute>
        <TestContent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('shows login form when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      error: null
    });

    render(
      <ProtectedRoute>
        <TestContent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Sign in to AIrium')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('shows protected content when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        profile: 'GENERAL',
        groups: ['general']
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      error: null
    });

    render(
      <ProtectedRoute>
        <TestContent />
      </ProtectedRoute>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('shows access denied when user lacks required role', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        profile: 'GENERAL',
        groups: ['general']
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      error: null
    });

    render(
      <ProtectedRoute requiredRole="ADMIN">
        <TestContent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText(/Required role: ADMIN/)).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('shows protected content when user has required role', () => {
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

    render(
      <ProtectedRoute requiredRole="ADMIN">
        <TestContent />
      </ProtectedRoute>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('shows custom fallback when provided', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      error: null
    });

    const CustomFallback = () => <div data-testid="custom-fallback">Custom Fallback</div>;

    render(
      <ProtectedRoute fallback={<CustomFallback />}>
        <TestContent />
      </ProtectedRoute>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.queryByText('Sign in to AIrium')).not.toBeInTheDocument();
  });
});