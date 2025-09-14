import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { configureAmplify, amplifyOutputs } from '../../lib/amplify';

export interface User {
  id: string;
  email: string;
  profile: 'ADMIN' | 'GENERAL';
  groups: string[];
  name?: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Amplify configuration
  useEffect(() => {
    configureAmplify();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if we have a valid configuration
      if (!amplifyOutputs.auth?.user_pool_id || amplifyOutputs.auth.user_pool_id.includes('PLACEHOLDER')) {
        // Fallback to mock authentication for development
        console.warn('Using mock authentication - backend not deployed');
        const mockUser: User = {
          id: '1',
          email: credentials.email,
          profile: credentials.email.includes('admin') ? 'ADMIN' : 'GENERAL',
          groups: credentials.email.includes('admin') ? ['admin'] : ['general'],
          name: credentials.email.split('@')[0]
        };

        setUser(mockUser);
        localStorage.setItem('airium_user', JSON.stringify(mockUser));
        return;
      }

      // Use Amplify Auth with deployed Cognito
      const { isSignedIn } = await signIn({
        username: credentials.email,
        password: credentials.password
      });

      if (isSignedIn) {
        await loadUserData();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid credentials. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Check if we have a valid configuration
      if (!amplifyOutputs.auth?.user_pool_id || amplifyOutputs.auth.user_pool_id.includes('PLACEHOLDER')) {
        // Fallback for development
        setUser(null);
        localStorage.removeItem('airium_user');
        return;
      }

      // Use Amplify Auth
      await signOut();
      setUser(null);
      localStorage.removeItem('airium_user');
    } catch (err: any) {
      console.error('Logout error:', err);
      setError('Failed to logout. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();

      // Extract user information from Cognito
      const userData: User = {
        id: currentUser.userId,
        email: currentUser.signInDetails?.loginId || '',
        profile: 'GENERAL', // Default, will be updated from user attributes
        groups: [], // Will be populated from token claims
        name: currentUser.signInDetails?.loginId?.split('@')[0]
      };

      // Extract groups from JWT token if available
      if (session.tokens?.accessToken) {
        const payload = session.tokens.accessToken.payload;
        if (payload['cognito:groups']) {
          userData.groups = payload['cognito:groups'] as string[];
          // Set profile based on groups
          userData.profile = userData.groups.includes('ADMIN') ? 'ADMIN' : 'GENERAL';
        }
      }

      setUser(userData);
      localStorage.setItem('airium_user', JSON.stringify(userData));
    } catch (err) {
      console.error('Failed to load user data:', err);
      throw err;
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        // Check if we have a valid configuration
        if (!amplifyOutputs.auth?.user_pool_id || amplifyOutputs.auth.user_pool_id.includes('PLACEHOLDER')) {
          // Fallback for development
          const storedUser = localStorage.getItem('airium_user');
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
          return;
        }

        // Check Amplify Auth session
        const currentUser = await getCurrentUser();
        if (currentUser) {
          await loadUserData();
        }
      } catch (err) {
        console.log('No authenticated user found');
        // Clear any stale data
        localStorage.removeItem('airium_user');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthState();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};