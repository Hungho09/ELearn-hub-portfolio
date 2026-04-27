'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import {
  GraduationCap,
  LayoutDashboard,
  Inbox,
  BookOpen,
  Brain,
  CheckSquare,
  Users,
  Settings,
  LogOut,
  LogIn,
  Bell,
  User,
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
  href?: string;
  badge?: number;
}

/** Overview navigation items */
const overviewItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { label: 'Inbox', icon: Inbox, badge: 3 },
  { label: 'Flashcard', icon: Brain, href: '/flashcard' },
  { label: 'Lesson', icon: BookOpen, href: '/english' },
  { label: 'Task', icon: CheckSquare },
  { label: 'Group', icon: Users },
];

/** Settings navigation items */
const settingsItems: NavItem[] = [
  { label: 'Settings', icon: Settings, href: '/profile' },
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
 * Integrates with NextAuth for user session display.
 */
export function Sidebar({ collapsed = false, onNavigate }: SidebarProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const handleNavClick = (item: NavItem) => {
    if (item.href) {
      router.push(item.href);
    }
    onNavigate?.();
  };

  const handleLogoClick = () => {
    router.push('/');
    onNavigate?.();
  };

  const handleAuthAction = async () => {
    if (session) {
      await signOut({ redirect: false });
      router.push('/login');
      router.refresh();
    } else {
      router.push('/login');
    }
    onNavigate?.();
  };

  /** Get user display name */
  const userName = session?.user?.name || 'Guest';
  const userRole = session ? 'Pro Learner' : 'Not signed in';
  const userAvatar = session?.user?.avatar || '/images/user-avatar.png';
  const userInitial = userName.charAt(0).toUpperCase();

  /** Render a single navigation item */
  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = item.href === pathname || (item.href === '/' && pathname === '/');

    const button = (
      <button
        key={item.label}
        onClick={() => handleNavClick(item)}
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
      <button
        onClick={handleLogoClick}
        className={cn('flex items-center gap-2.5 px-4 py-5 w-full hover:bg-muted/50 transition-colors', collapsed && 'justify-center px-2')}
      >
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
          <GraduationCap className="size-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight text-foreground">LearnHub</span>
        )}
      </button>

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
              Account
            </p>
          )}
          {settingsItems.map(renderNavItem)}

          {/* Logout / Login button */}
          <button
            onClick={handleAuthAction}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
              'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {session ? <LogOut className="size-5 shrink-0" /> : <LogIn className="size-5 shrink-0" />}
            {!collapsed && <span className="flex-1 text-left">{session ? 'Logout' : 'Login'}</span>}
          </button>
        </div>
      </ScrollArea>

      <Separator />

      {/* User section at bottom */}
      <button
        onClick={() => { router.push('/profile'); onNavigate?.(); }}
        className={cn(
          'flex items-center gap-3 px-4 py-4 w-full hover:bg-muted/50 transition-colors text-left',
          collapsed && 'justify-center px-2'
        )}
      >
        <Avatar className="size-9 ring-2 ring-primary/20">
          <AvatarImage src={userAvatar} alt={userName} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
            {userInitial}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <div className="flex flex-1 items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">{userRole}</p>
            </div>
            <div className="relative rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <Bell className="size-4" />
              {session && <span className="absolute -right-0.5 -top-0.5 flex size-2 rounded-full bg-destructive" />}
            </div>
          </div>
        )}
      </button>
    </aside>
  );
}
