import React from 'react';
import { useAuth } from './AuthProvider';
import { Button } from '../ui/button';

interface NavigationItem {
  label: string;
  icon: string;
  href?: string;
  onClick?: () => void;
  roles: ('ADMIN' | 'GENERAL')[];
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    icon: '📊',
    href: '/',
    roles: ['ADMIN', 'GENERAL']
  },
  {
    label: 'User Management',
    icon: '👥',
    href: '/admin/users',
    roles: ['ADMIN']
  },
  {
    label: 'Applications',
    icon: '⚙️',
    href: '/admin/applications',
    roles: ['ADMIN']
  },
  {
    label: 'Chat Interface',
    icon: '💬',
    href: '/chat',
    roles: ['ADMIN', 'GENERAL']
  },
  {
    label: 'Voice Chat',
    icon: '🎤',
    href: '/voice',
    roles: ['ADMIN', 'GENERAL']
  },
  {
    label: 'Media Upload',
    icon: '📁',
    href: '/media',
    roles: ['ADMIN', 'GENERAL']
  }
];

interface RoleBasedNavigationProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  onNavigate?: (href: string) => void;
}

export const RoleBasedNavigation: React.FC<RoleBasedNavigationProps> = ({
  className = '',
  orientation = 'vertical',
  onNavigate
}) => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const allowedItems = navigationItems.filter(item => 
    item.roles.includes(user.profile)
  );

  const handleItemClick = (item: NavigationItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.href && onNavigate) {
      onNavigate(item.href);
    } else if (item.href) {
      window.location.href = item.href;
    }
  };

  const containerClass = orientation === 'horizontal' 
    ? 'flex items-center space-x-2' 
    : 'flex flex-col space-y-1';

  const buttonClass = orientation === 'horizontal'
    ? 'justify-center'
    : 'w-full justify-start';

  return (
    <nav className={`${containerClass} ${className}`}>
      {allowedItems.map((item) => (
        <Button
          key={item.label}
          variant="ghost"
          className={buttonClass}
          onClick={() => handleItemClick(item)}
        >
          <span className={orientation === 'horizontal' ? '' : 'mr-2'}>
            {item.icon}
          </span>
          <span className={orientation === 'horizontal' ? 'sr-only' : 'truncate'}>
            {item.label}
          </span>
        </Button>
      ))}
    </nav>
  );
};