'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Globe, Lock, ArrowRight, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LanguageCardProps {
  /** Language display name in English */
  name: string;
  /** Language name in native language */
  nativeName: string;
  /** Globe icon with color accent */
  flag: React.ReactNode;
  /** Short description */
  description: string;
  /** Whether the language is available for study */
  available: boolean;
  /** Number of words learned */
  wordsLearned?: number;
  /** Total words available */
  totalWords?: number;
  /** Streak days */
  streakDays?: number;
  /** Callback when "Start Learning" is clicked */
  onStart: () => void;
  /** Color accent for the card */
  accentColor?: string;
}

export function LanguageCard({
  name,
  nativeName,
  flag,
  description,
  available,
  wordsLearned = 0,
  totalWords = 0,
  streakDays = 0,
  onStart,
  accentColor = 'primary',
}: LanguageCardProps) {
  const progressPercent = totalWords > 0 ? (wordsLearned / totalWords) * 100 : 0;
  const hasProgress = wordsLearned > 0;

  return (
    <div
      className={cn(
        'p-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[2.25rem] shadow-sm hover:scale-[1.02] hover:shadow-[0_24px_80px_rgba(108,92,231,0.05)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group relative flex flex-col',
        available ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
      )}
      onClick={available ? onStart : undefined}
    >
      {/* Decorative neon glow overlay on hover */}
      {available && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] pointer-events-none rounded-[2.25rem]" />
      )}

      {/* Inner Core */}
      <div className={cn(
        'flex-1 p-6 rounded-[calc(2.25rem-4px)] bg-[#ffffff]/50 dark:bg-[#0c0c1b]/50 backdrop-blur-2xl border border-white/20 dark:border-white/5 flex flex-col justify-between relative overflow-hidden',
        !available && 'opacity-80'
      )}>
        <div>
          {/* Header: Flag + Name */}
          <div className="flex items-start gap-4">
            <div className={cn(
              'flex size-14 items-center justify-center rounded-[1.25rem] shrink-0 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105 shadow-sm border',
              available 
                ? 'bg-white/45 dark:bg-white/10 border-white/40 dark:border-white/5' 
                : 'bg-muted/30 border-border/20'
            )}>
              {flag}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-foreground tracking-tight leading-tight">{name}</h3>
                {!available && (
                  <Badge variant="secondary" className="text-[9px] gap-1 rounded-full px-2.5 py-0.5 border border-border/10">
                    <Lock strokeWidth={1.2} className="size-2.5" />
                    Soon
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{nativeName}</p>
            </div>
          </div>

          {/* Description */}
          <p className="mt-4 text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>

        <div>
          {/* Progress (only for available languages) */}
          {available && (
            <div className="mt-5 mb-5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">
                  {hasProgress ? `${wordsLearned} / ${totalWords} từ` : `${totalWords} từ sẵn có`}
                </span>
                {hasProgress && (
                  <span className="font-bold text-primary dark:text-[#A29BFE]">{Math.round(progressPercent)}%</span>
                )}
              </div>
              <Progress value={progressPercent} className="h-1.5 rounded-full" />
              {streakDays > 0 && (
                <p className="text-xs text-orange-500 font-bold flex items-center gap-1.5 mt-2">
                  <Flame strokeWidth={1.5} className="size-3.5" />
                  Chuỗi {streakDays} ngày
                </p>
              )}
            </div>
          )}

          {/* CTA Button - Button-in-Button Trailing Icon pattern */}
          <div className={cn("mt-5", !available && "mt-8")}>
            {available ? (
              <button
                className="w-full relative flex items-center justify-between rounded-full bg-primary hover:bg-primary/95 text-white pl-6 pr-1.5 py-1.5 text-xs font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group/btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onStart();
                }}
              >
                <span className="tracking-tight">{hasProgress ? 'Tiếp tục học tập' : 'Bắt đầu học'}</span>
                <div className="w-8 h-8 rounded-full bg-white/15 dark:bg-white/10 flex items-center justify-center transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/btn:translate-x-0.5 group-hover/btn:scale-105">
                  <ArrowRight strokeWidth={1.5} className="size-4 text-white" />
                </div>
              </button>
            ) : (
              <button 
                className="w-full relative flex items-center justify-between rounded-full bg-muted border border-border/10 pl-6 pr-2 py-2 text-xs font-bold text-muted-foreground cursor-not-allowed"
                disabled
              >
                <span className="tracking-tight">Sắp ra mắt</span>
                <div className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                  <Lock strokeWidth={1.2} className="size-3.5 text-muted-foreground" />
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
