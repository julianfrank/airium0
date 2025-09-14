import React, { useState } from 'react';
import { Button } from '../ui/button';
import { 
  Users, 
  Settings, 
  Grid3X3, 
  MessageSquare, 
  Upload,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Grid3X3,
    href: '/admin'
  },
  {
    id: 'users',
    label: 'User Management',
    icon: Users,
    href: '/admin/users'
  },
  {
    id: 'applications',
    label: 'Applications',
    icon: Settings,
    href: '/admin/applications'
  },
  {
    id: 'chat',
    label: 'Chat Interface',
    icon: MessageSquare,
    href: '/chat'
  },
  {
    id: 'media',
    label: 'Media Upload',
    icon: Upload,
    href: '/media'
  }
];

export const AdminSidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState('dashboard');

  return (
    <div className={cn(
      "relative flex flex-col border-r bg-background transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Collapse Toggle */}
      <div className="flex h-14 items-center justify-end px-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start",
                isCollapsed && "px-2"
              )}
              onClick={() => setActiveItem(item.id)}
            >
              <Icon className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
              {!isCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </Button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-2">
        <div className={cn(
          "flex items-center space-x-2 px-2 py-1",
          isCollapsed && "justify-center"
        )}>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Admin User</p>
              <p className="text-xs text-muted-foreground truncate">admin@airium.com</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};