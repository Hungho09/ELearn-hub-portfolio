'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const ALL_BADGES = [
  { code: 'FIRST_BLOOD', label: 'Bước chân đầu tiên', emoji: '🩸' },
  { code: 'STREAK_3', label: 'Lính mới chăm chỉ', emoji: '💪' },
  { code: 'STREAK_7', label: 'Chiến binh kỷ luật', emoji: '🔥' },
  { code: 'MASTER_10', label: 'Bậc thầy nhập môn', emoji: '🏆' },
  { code: 'SCHOLAR_100', label: 'Học giả kiên trì', emoji: '📚' },
  { code: 'NIGHT_OWL', label: 'Cú đêm', emoji: '🌙' },
];

interface BadgeGridProps {
  unlockedBadges: string[];
}

export function BadgeGrid({ unlockedBadges }: BadgeGridProps) {
  const unlocked = new Set(unlockedBadges);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {ALL_BADGES.map((badge) => {
        const isUnlocked = unlocked.has(badge.code);
        return (
          <Card
            key={badge.code}
            className={cn(
              'transition-all duration-300',
              isUnlocked
                ? 'border-amber-500/30 bg-amber-50 dark:bg-amber-950/10'
                : 'border-muted bg-muted/30 opacity-60 grayscale'
            )}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn(
                'size-10 rounded-lg flex items-center justify-center text-xl',
                isUnlocked ? 'bg-amber-500/10' : 'bg-muted'
              )}>
                {isUnlocked ? (
                  <span>{badge.emoji}</span>
                ) : (
                  <Lock className="size-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col">
                <span className={cn(
                  'text-sm font-medium leading-tight',
                  isUnlocked ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {badge.label}
                </span>
                {isUnlocked && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    Đã mở
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
