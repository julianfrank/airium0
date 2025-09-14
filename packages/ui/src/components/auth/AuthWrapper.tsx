import React, { ReactNode } from 'react';
import { AuthProvider } from './AuthProvider';
import { ProtectedRoute } from './ProtectedRoute';

interface AuthWrapperProps {
  children: ReactNode;
  requireAuth?: boolean;
  requiredRole?: 'ADMIN' | 'GENERAL';
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({
  children,
  requireAuth = true,
  requiredRole
}) => {
  return (
    <AuthProvider>
      {requireAuth ? (
        <ProtectedRoute requiredRole={requiredRole}>
          {children}
        </ProtectedRoute>
      ) : (
        children
      )}
    </AuthProvider>
  );
};