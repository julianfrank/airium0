import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export const UserProfile: React.FC = () => {
  const { user, logout } = useAuth();
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
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
        <CardDescription>Your account information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg">
                {user.profile === 'ADMIN' ? '👑' : '👤'}
              </span>
            </div>
            <div>
              <p className="font-medium">{user.name || user.email.split('@')[0]}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Role:</span>
            <span className={`text-sm px-2 py-1 rounded-full ${
              user.profile === 'ADMIN' 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
              {user.profile}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm font-medium">Groups:</span>
            <div className="flex flex-wrap gap-1">
              {user.groups.map((group) => (
                <span 
                  key={group}
                  className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-full"
                >
                  {group}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full"
          >
            {isLoggingOut ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};