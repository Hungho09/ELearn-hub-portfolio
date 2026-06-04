'use client';

import { useState, useEffect } from 'react';
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
  Users,
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
  { label: 'Không gian học', icon: Users, href: '/workspace' },
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
  const [dueCount, setDueCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (status === 'loading' || !session?.user) return;
    const userId = session.user.id || session.user.email || 'guest';

    const fetchDueCount = async () => {
      try {
        const res = await fetch(`/api/flashcards/session?user_id=${encodeURIComponent(userId)}&limit=1`);
        if (res.ok) {
          const data = await res.json();
          setDueCount(data.total_due ?? 0);
        }
      } catch (err) {
        console.error('Failed to fetch due review count for notification:', err);
      }
    };

    fetchDueCount();
    // Poll every 60 seconds to keep notification up-to-date
    const interval = setInterval(fetchDueCount, 60000);
    return () => clearInterval(interval);
  }, [session, status]);

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
          'group flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] border border-transparent',
          isActive
            ? 'bg-primary/10 text-primary dark:text-[#A29BFE] dark:bg-[#A29BFE]/10 border-primary/10 dark:border-[#A29BFE]/10 shadow-[0_4px_20px_rgba(108,92,231,0.06)] hover:scale-[1.02] active:scale-[0.98]'
            : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground hover:scale-[1.02] active:scale-[0.98]'
        )}
      >
        <Icon 
          strokeWidth={1.2} 
          className={cn(
            "size-5 shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-110", 
            isActive ? "text-primary dark:text-[#A29BFE]" : "text-muted-foreground"
          )} 
        />
        {!collapsed && (
          <>
            <span className="flex-1 text-left tracking-tight">{item.label}</span>
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
        'h-full p-3 shrink-0 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]',
        collapsed ? 'w-[88px]' : 'w-[256px]'
      )}
    >
      {/* Outer Shell - Double-Bezel nested architecture */}
      <div className="h-full rounded-[2rem] p-1.5 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.03)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.3)] flex flex-col">
        {/* Inner Core */}
        <div className="flex-1 flex flex-col rounded-[calc(2rem-6px)] bg-[#ffffff]/65 dark:bg-[#0c0c1b]/65 backdrop-blur-3xl overflow-hidden border border-white/20 dark:border-white/5 relative">
          
          {/* Logo */}
          <button
            onClick={handleLogoClick}
            className={cn('flex items-center gap-2.5 px-4 py-5 w-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors', collapsed && 'justify-center px-2')}
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#A29BFE] shadow-[0_4px_15px_rgba(108,92,231,0.25)] transition-all duration-500 hover:scale-105 active:scale-95">
              <GraduationCap strokeWidth={1.5} className="size-5 text-white" />
            </div>
            {!collapsed && (
              <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-[#A29BFE]">LearnHub</span>
            )}
          </button>

          <Separator className="bg-border/20" />

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

              <Separator className="my-3 bg-border/10" />

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
                  <Separator className="my-3 bg-border/10" />
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
                  'group flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] border border-transparent',
                  'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground hover:scale-[1.02] active:scale-[0.98]'
                )}
              >
                {session ? (
                  <LogOut strokeWidth={1.2} className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                ) : (
                  <LogIn strokeWidth={1.2} className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                )}
                {!collapsed && <span className="flex-1 text-left tracking-tight">{session ? 'Logout' : 'Login'}</span>}
              </button>
            </div>
          </ScrollArea>

          <Separator className="bg-border/20" />

          {/* User section at bottom */}
          <div
            className={cn(
              'flex items-center gap-3 px-3 py-4 w-full border-t border-border/10 transition-all text-left relative',
              collapsed && 'justify-center px-2'
            )}
          >
            <button
              onClick={() => { router.push('/profile'); onNavigate?.(); }}
              className="flex flex-1 items-center gap-2.5 min-w-0"
            >
              <Avatar className="size-9 ring-2 ring-primary/20 shadow-[0_0_10px_rgba(108,92,231,0.06)] transition-transform duration-500 hover:scale-105">
                <AvatarImage src={userAvatar} alt={userName} />
                <AvatarFallback className="bg-gradient-to-br from-primary/10 to-[#A29BFE]/10 text-primary dark:text-[#A29BFE] text-sm font-bold">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground transition-colors hover:text-primary leading-tight">{userName}</p>
                  <p className="truncate text-[10px] font-medium text-muted-foreground mt-0.5 leading-none">{userRole}</p>
                </div>
              )}
            </button>

            {!collapsed && (
              <div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNotifications(!showNotifications);
                  }}
                  className={cn(
                    "relative rounded-xl p-2 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] border border-transparent",
                    showNotifications 
                      ? "bg-primary/10 text-primary dark:text-[#A29BFE] dark:bg-[#A29BFE]/10 border-primary/10 dark:border-[#A29BFE]/10" 
                      : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  <Bell strokeWidth={1.2} className="size-4" />
                  {dueCount > 0 && <span className="absolute right-1.5 top-1.5 flex size-1.5 rounded-full bg-destructive animate-pulse" />}
                </button>
              </div>
            )}

            {/* Notification Popover Dropdown - Double-Bezel nested shell */}
            {!collapsed && showNotifications && (
              <div 
                className="absolute bottom-16 left-4 w-[280px] p-1.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 animate-in fade-in slide-in-from-bottom-2 duration-500"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="rounded-[calc(1rem-4px)] bg-[#ffffff]/95 dark:bg-[#0c0c1b]/95 border border-white/20 dark:border-white/5 p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-border/10 pb-2">
                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Thông báo ôn tập</span>
                    <button 
                      onClick={() => setShowNotifications(false)}
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Đóng
                    </button>
                  </div>
                  {dueCount > 0 ? (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Bạn đang có <span className="font-bold text-cyan-500 dark:text-cyan-400">{dueCount} từ vựng</span> cần được ôn tập lại hôm nay theo lịch ôn tập ngắt quãng (SRS).
                      </p>
                      <button
                        onClick={() => {
                          setShowNotifications(false);
                          router.push('/study/english?mode=review');
                          onNavigate?.();
                        }}
                        className="w-full text-center py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-md shadow-primary/20"
                      >
                        🎯 Ôn tập ngay
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground leading-relaxed text-center py-2 select-none">
                      🎉 Tuyệt vời! Bạn không có từ vựng nào cần ôn tập hôm nay. Hãy học từ mới nhé!
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
