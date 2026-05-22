'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Flame, BookOpen, Brain, Trophy, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LearningStatsProps {
  totalReviews: number;
  wordsMastered: number;
  wordsLearning: number;
  streakDays: number;
  reviewsToday: number;
  currentLevel?: number;
}

export function LearningStats({
  totalReviews,
  wordsMastered,
  wordsLearning,
  streakDays,
  reviewsToday,
  currentLevel,
}: LearningStatsProps) {
  const statItems = [
    {
      label: 'Chuỗi ngày',
      value: streakDays,
      icon: Flame,
      color: 'text-orange-500',
      border: 'border-l-orange-500',
    },
    {
      label: 'Hôm nay',
      value: reviewsToday,
      icon: BookOpen,
      color: 'text-primary',
      border: 'border-l-primary',
    },
    {
      label: 'Đã thành thạo',
      value: wordsMastered,
      icon: Trophy,
      color: 'text-emerald-600',
      border: 'border-l-emerald-500',
    },
    {
      label: 'Tổng ôn tập',
      value: totalReviews,
      icon: Brain,
      color: 'text-purple-600 dark:text-purple-400',
      border: 'border-l-purple-500',
    },
    ...(currentLevel !== undefined
      ? [
          {
            label: 'Cấp độ',
            value: currentLevel,
            icon: Shield,
            color: 'text-cyan-600',
            border: 'border-l-cyan-500',
          },
        ]
      : []),
    {
      label: 'Đang học',
      value: wordsLearning,
      icon: BookOpen,
      color: 'text-amber-600',
      border: 'border-l-amber-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {statItems.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card 
            key={stat.label} 
            variant="interactive-glass" 
            className={cn(
              'border-l-4 py-4 transition-all duration-300 hover:scale-105', 
              stat.border
            )}
          >
            <CardContent className="p-3 flex flex-col justify-between h-full">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className={cn('size-4 shrink-0', stat.color)} />
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className={cn('text-2xl font-black tracking-tight mt-1', stat.color)}>{stat.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
