'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import {
  GraduationCap,
  Home,
  BarChart3,
  Calendar,
  Settings,
  Shield,
  LogOut,
  LogIn,
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
  href?: string;
  badge?: number;
}

/** Learning navigation items */
const learningItems: NavItem[] = [
  { label: 'Trang chủ', icon: Home, href: '/' },
  { label: 'Thống kê', icon: BarChart3, href: '/stats' },
  { label: 'Lịch sử học', icon: Calendar, href: '/heatmap' },
];

/** Admin navigation items (only shown for admin users) */
const adminItems: NavItem[] = [
  { label: 'Admin', icon: Shield, href: '/admin' },
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
  const isAdmin = session?.user?.role === 'admin';
  const userName = session?.user?.name || 'Học viên';
  const userRole = isAdmin ? 'Admin' : session ? 'Học viên Pro' : 'Chưa đăng nhập';
  const userAvatar = session?.user?.avatar || '/images/user-avatar.png';
  const userInitial = userName.charAt(0).toUpperCase();

  /** Render a single navigation item */
  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = item.href === pathname ||
      (item.href !== '/' && pathname.startsWith(item.href || ''));

    const button = (
      <button
        key={item.label}
        onClick={() => handleNavClick(item)}
        className={cn(
          'group flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-[var(--duration-normal)] ease-[var(--ease-out)]',
          isActive
            ? 'bg-primary/15 text-primary dark:text-[#A29BFE] dark:bg-[#A29BFE]/15 border border-primary/25 dark:border-[#A29BFE]/20 shadow-[0_0_15px_rgba(108,92,231,0.12)] hover:scale-[1.02]'
            : 'text-muted-foreground hover:bg-white/15 dark:hover:bg-white/5 hover:text-foreground hover:scale-[1.02]'
        )}
      >
        <Icon className={cn("size-5 shrink-0 transition-transform duration-300 group-hover:scale-110", isActive ? "text-primary dark:text-[#A29BFE] animate-pulse" : "text-muted-foreground")} />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className="flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white shadow-sm">
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
          <TooltipContent side="right" className="glass-sheet border-border/40 text-foreground">{item.label}</TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-card/45 backdrop-blur-xl transition-all duration-[var(--duration-normal)] ease-[var(--ease-out)]',
        collapsed ? 'w-[72px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <button
        onClick={handleLogoClick}
        className={cn('flex items-center gap-2.5 px-4 py-5 w-full hover:bg-white/10 dark:hover:bg-white/5 transition-colors', collapsed && 'justify-center px-2')}
      >
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#A29BFE] shadow-[0_4px_15px_rgba(108,92,231,0.3)] transition-all hover:scale-105">
          <GraduationCap className="size-5 text-primary-foreground dark:text-[#080811]" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-primary to-[#A29BFE]">LearnHub</span>
        )}
      </button>

      <Separator className="bg-border/30" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="flex flex-col gap-1">
          {/* Learning Section */}
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Học tập
            </p>
          )}
          {learningItems.map(renderNavItem)}

          <Separator className="my-3 bg-border/20" />

          {/* Account Section */}
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Tài khoản
            </p>
          )}
          {settingsItems.map(renderNavItem)}

          {/* Admin Section (only for admin users) */}
          {isAdmin && (
            <>
              <Separator className="my-3 bg-border/20" />
              {!collapsed && (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  Quản trị
                </p>
              )}
              {adminItems.map(renderNavItem)}
            </>
          )}

          {/* Logout / Login button */}
          <button
            onClick={handleAuthAction}
            className={cn(
              'group flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-[var(--duration-normal)] ease-[var(--ease-out)]',
              'text-muted-foreground hover:bg-white/15 dark:hover:bg-white/5 hover:text-foreground hover:scale-[1.02]'
            )}
          >
            {session ? <LogOut className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5" /> : <LogIn className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5" />}
            {!collapsed && <span className="flex-1 text-left">{session ? 'Logout' : 'Login'}</span>}
          </button>
        </div>
      </ScrollArea>

      <Separator className="bg-border/30" />

      {/* User section at bottom */}
      <button
        onClick={() => { router.push('/profile'); onNavigate?.(); }}
        className={cn(
          'flex items-center gap-3 px-4 py-4 w-full hover:bg-white/10 dark:hover:bg-white/5 transition-all text-left',
          collapsed && 'justify-center px-2'
        )}
      >
        <Avatar className="size-9 ring-2 ring-primary/30 shadow-[0_0_10px_rgba(108,92,231,0.1)] transition-transform hover:scale-105">
          <AvatarImage src={userAvatar} alt={userName} />
          <AvatarFallback className="bg-gradient-to-br from-primary/10 to-[#A29BFE]/10 text-primary dark:text-[#A29BFE] text-sm font-bold">
            {userInitial}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <div className="flex flex-1 items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground transition-colors hover:text-primary">{userName}</p>
              <p className="truncate text-[10px] font-medium text-muted-foreground">{userRole}</p>
            </div>
            <div className="relative rounded-md p-1.5 text-muted-foreground hover:bg-white/15 dark:hover:bg-white/5 hover:text-foreground transition-colors">
              <Bell className="size-4" />
              {session && <span className="absolute right-1 top-1 flex size-2 rounded-full bg-destructive animate-pulse" />}
            </div>
          </div>
        )}
      </button>
    </aside>
  );
}
