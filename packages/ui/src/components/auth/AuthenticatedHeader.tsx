import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { UserProfile } from './UserProfile';
import { Button } from '../ui/button';

export const AuthenticatedHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {/* User Profile Dropdown */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowProfile(!showProfile)}
          className="relative"
        >
          <span className="sr-only">User menu</span>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            {user.profile === 'ADMIN' ? '👑' : '👤'}
          </div>
        </Button>

        {showProfile && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowProfile(false)}
            />
            
            {/* Profile Dropdown */}
            <div className="absolute right-0 mt-2 w-80 z-50">
              <UserProfile />
            </div>
          </>
        )}
      </div>

      {/* Quick Logout Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        disabled={isLoggingOut}
        title="Sign out"
      >
        <span className="sr-only">Logout</span>
        {isLoggingOut ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
        ) : (
          '🚪'
        )}
      </Button>
    </div>
  );
};