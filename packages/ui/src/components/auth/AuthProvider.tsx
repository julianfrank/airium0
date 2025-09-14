import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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

  // Mock authentication for now - will be replaced with Amplify Auth
  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock user data - will be replaced with actual Amplify Auth
      const mockUser: User = {
        id: '1',
        email: credentials.email,
        profile: credentials.email.includes('admin') ? 'ADMIN' : 'GENERAL',
        groups: credentials.email.includes('admin') ? ['admin'] : ['general'],
        name: credentials.email.split('@')[0]
      };
      
      setUser(mockUser);
      localStorage.setItem('airium_user', JSON.stringify(mockUser));
    } catch (err) {
      setError('Invalid credentials. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setUser(null);
      localStorage.removeItem('airium_user');
    } catch (err) {
      setError('Failed to logout. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const storedUser = localStorage.getItem('airium_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error('Failed to restore auth state:', err);
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