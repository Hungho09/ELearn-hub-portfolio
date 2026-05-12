'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Bell, Mail, ChevronRight } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

/**
 * ProfileCard - User profile card with avatar, name, email, stats and notification icons.
 * Displays user info from NextAuth session with a "My Profile" action button.
 */
export function ProfileCard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const userName = session?.user?.name || 'Guest';
  const userEmail = session?.user?.email || 'Sign in to get started';
  const userAvatar = session?.user?.avatar || '/images/user-avatar.png';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <Card className="shadow-sm border-border/50 py-0 gap-0">
      <CardContent className="p-5">
        {/* Avatar and user info */}
        <div className="flex flex-col items-center text-center">
          <Avatar className="size-[68px] ring-4 ring-primary/20 ring-offset-2 ring-offset-card">
            <AvatarImage src={userAvatar} alt={userName} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <h3 className="mt-3 text-sm font-bold text-foreground">{userName}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{userEmail}</p>

          {/* Stats row */}
          <div className="mt-3 flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">12</p>
              <p className="text-[10px] text-muted-foreground">Courses</p>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">48</p>
              <p className="text-[10px] text-muted-foreground">Completed</p>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">5</p>
              <p className="text-[10px] text-muted-foreground">Certificates</p>
            </div>
          </div>

          {/* Notification icons */}
          <div className="mt-3 flex items-center gap-3">
            <button
              className="relative flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white">
                3
              </span>
            </button>
            <button
              className="relative flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              aria-label="Messages"
            >
              <Mail className="size-4" />
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white">
                5
              </span>
            </button>
          </div>
        </div>

        <Separator className="my-4" />

        {/* My Profile button */}
        <Button
          variant="outline"
          className="w-full gap-1 text-xs h-9"
          size="sm"
          onClick={() => {
            if (session) {
              router.push('/profile');
            } else {
              router.push('/login');
            }
          }}
        >
          {session ? 'My Profile' : 'Sign In'}
          <ChevronRight className="size-3" />
        </Button>
      </CardContent>
    </Card>
  );
}
