'use client';

import { Bell, Mail, ChevronRight } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

/**
 * ProfileCard - User profile card with avatar, name, email, and notification icons.
 * Displays user info with a "My Profile" action button.
 */
export function ProfileCard() {
  return (
    <Card className="shadow-sm border-border/50 py-0 gap-0">
      <CardContent className="p-5">
        {/* Avatar and user info */}
        <div className="flex flex-col items-center text-center">
          <Avatar className="size-16 ring-4 ring-primary/20 ring-offset-2 ring-offset-card">
            <AvatarImage src="/images/user-avatar.png" alt="Alex Johnson" />
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
              AJ
            </AvatarFallback>
          </Avatar>
          <h3 className="mt-3 text-sm font-bold text-foreground">Alex Johnson</h3>
          <p className="text-xs text-muted-foreground">alex.johnson@email.com</p>

          {/* Notification icons */}
          <div className="mt-3 flex items-center gap-3">
            <button
              className="relative flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
              <span className="absolute -right-0.5 -top-0.5 flex size-2.5 items-center justify-center rounded-full bg-destructive text-[7px] font-bold text-white">
                3
              </span>
            </button>
            <button
              className="relative flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              aria-label="Messages"
            >
              <Mail className="size-4" />
              <span className="absolute -right-0.5 -top-0.5 flex size-2.5 items-center justify-center rounded-full bg-primary text-[7px] font-bold text-white">
                5
              </span>
            </button>
          </div>
        </div>

        <Separator className="my-4" />

        {/* My Profile button */}
        <Button variant="outline" className="w-full gap-1 text-xs" size="sm">
          My Profile
          <ChevronRight className="size-3" />
        </Button>
      </CardContent>
    </Card>
  );
}
