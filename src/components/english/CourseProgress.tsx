'use client';

import { Trophy, Clock, BookOpen, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

/** Progress stat item */
interface ProgressStat {
  label: string;
  value: string;
  icon: React.ElementType;
  iconColor: string;
}

/** Mock progress stats */
const progressStats: ProgressStat[] = [
  { label: 'Lessons Done', value: '3 / 16', icon: BookOpen, iconColor: 'text-primary' },
  { label: 'Time Spent', value: '1h 35m', icon: Clock, iconColor: 'text-amber-500' },
  { label: 'Quiz Score', value: '85%', icon: Target, iconColor: 'text-emerald-500' },
];

/**
 * CourseProgress - Card showing overall course completion
 * percentage with a progress bar and detailed stats.
 */
export function CourseProgress() {
  const completionPercent = 19;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Trophy className="size-4 text-primary" />
          </div>
          <CardTitle className="text-sm font-semibold">Course Progress</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Main progress */}
        <div className="text-center">
          <div className="relative inline-flex size-20 items-center justify-center">
            <svg className="size-20 -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-muted"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - completionPercent / 100)}`}
                className="text-primary transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-foreground">{completionPercent}%</span>
              <span className="text-[9px] text-muted-foreground font-medium">Complete</span>
            </div>
          </div>
        </div>

        <Progress value={completionPercent} className="h-1.5" />

        <Separator />

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          {progressStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="text-center">
                <Icon className={cn('size-4 mx-auto mb-1', stat.iconColor)} />
                <p className="text-sm font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
