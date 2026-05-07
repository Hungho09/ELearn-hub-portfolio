'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Lock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LanguageCardProps {
  /** Language display name in English */
  name: string;
  /** Language name in native language */
  nativeName: string;
  /** Flag emoji */
  flag: string;
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
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300',
        available
          ? 'hover:shadow-lg hover:-translate-y-1 cursor-pointer border-border/80'
          : 'opacity-60 cursor-not-allowed'
      )}
      onClick={available ? onStart : undefined}
    >
      {/* Decorative gradient overlay */}
      {available && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/8 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}

      <CardContent className="relative p-6">
        {/* Header: Flag + Name */}
        <div className="flex items-start gap-4">
          <div className={cn(
            'flex size-14 items-center justify-center rounded-xl text-3xl shrink-0',
            available ? 'bg-primary/10' : 'bg-muted'
          )}>
            {flag}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground">{name}</h3>
              {!available && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Lock className="size-2.5" />
                  Soon
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{nativeName}</p>
          </div>
        </div>

        {/* Description */}
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{description}</p>

        {/* Progress (only for available languages) */}
        {available && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {hasProgress ? `${wordsLearned} / ${totalWords} words` : `${totalWords} words to learn`}
              </span>
              {hasProgress && (
                <span className="font-semibold text-primary">{Math.round(progressPercent)}%</span>
              )}
            </div>
            <Progress value={progressPercent} className="h-1.5" />
            {streakDays > 0 && (
              <p className="text-xs text-orange-500 font-medium">
                🔥 {streakDays} day streak
              </p>
            )}
          </div>
        )}

        {/* CTA Button */}
        <div className="mt-4">
          {available ? (
            <Button
              className="w-full gap-2 group-hover:shadow-md transition-shadow"
              onClick={(e) => {
                e.stopPropagation();
                onStart();
              }}
            >
              {hasProgress ? 'Continue Learning' : 'Start Learning'}
              <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          ) : (
            <Button variant="outline" className="w-full gap-2" disabled>
              <Lock className="size-3.5" />
              Coming Soon
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
