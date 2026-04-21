'use client';

import {
  GraduationCap,
  LayoutDashboard,
  Inbox,
  BookOpen,
  CheckSquare,
  Users,
  Settings,
  LogOut,
  Bell,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/** Navigation item type definition */
interface NavItem {
  label: string;
  icon: React.ElementType;
  active?: boolean;
  badge?: number;
}

/** Overview navigation items */
const overviewItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Inbox', icon: Inbox, badge: 3 },
  { label: 'Lesson', icon: BookOpen },
  { label: 'Task', icon: CheckSquare },
  { label: 'Group', icon: Users },
];

/** Settings navigation items */
const settingsItems: NavItem[] = [
  { label: 'Settings', icon: Settings },
  { label: 'Logout', icon: LogOut },
];

/** Props for the Sidebar component */
interface SidebarProps {
  /** Whether the sidebar is in collapsed mode (icons only) */
  collapsed?: boolean;
  /** Mobile drawer open state callback */
  onNavigate?: () => void;
}

/**
 * Sidebar - Left navigation panel with logo, nav sections, and user info.
 * Supports collapsed mode for tablet and full mode for desktop.
 */
export function Sidebar({ collapsed = false, onNavigate }: SidebarProps) {
  /** Render a single navigation item */
  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = item.active;

    const button = (
      <button
        key={item.label}
        onClick={onNavigate}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Icon className="size-5 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className="flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                {item.badge}
              </span>
            )}
          </>
        )}
      </button>
    );

    // In collapsed mode, wrap with tooltip to show label on hover
    if (collapsed) {
      return (
        <Tooltip key={item.label}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-card transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-2.5 px-4 py-5', collapsed && 'justify-center px-2')}>
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
          <GraduationCap className="size-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight text-foreground">LearnHub</span>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="flex flex-col gap-1">
          {/* Overview Section */}
          {!collapsed && (
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Overview
            </p>
          )}
          {overviewItems.map(renderNavItem)}

          <Separator className="my-3" />

          {/* Settings Section */}
          {!collapsed && (
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Settings
            </p>
          )}
          {settingsItems.map(renderNavItem)}
        </div>
      </ScrollArea>

      <Separator />

      {/* User section at bottom */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-4',
          collapsed && 'justify-center px-2'
        )}
      >
        <Avatar className="size-9 ring-2 ring-primary/20">
          <AvatarImage src="/images/user-avatar.png" alt="Alex Johnson" />
          <AvatarFallback>AJ</AvatarFallback>
        </Avatar>
        {!collapsed && (
          <div className="flex flex-1 items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">Alex Johnson</p>
              <p className="truncate text-xs text-muted-foreground">Pro Learner</p>
            </div>
            <button className="relative rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <Bell className="size-4" />
              <span className="absolute -right-0.5 -top-0.5 flex size-2 rounded-full bg-destructive" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
