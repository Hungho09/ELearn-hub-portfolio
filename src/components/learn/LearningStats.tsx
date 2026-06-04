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
      color: 'text-emerald-600 dark:text-emerald-400',
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
            color: 'text-cyan-600 dark:text-cyan-400',
            border: 'border-l-cyan-500',
          },
        ]
      : []),
    {
      label: 'Đang học',
      value: wordsLearning,
      icon: BookOpen,
      color: 'text-amber-600 dark:text-amber-450',
      border: 'border-l-amber-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {statItems.map((stat) => {
        const Icon = stat.icon;
        return (
          <div 
            key={stat.label} 
            className="p-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl shadow-sm hover:scale-[1.03] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group"
          >
            {/* Inner Core */}
            <div className={cn(
              "h-full p-4 rounded-[calc(1rem-4px)] bg-[#ffffff]/50 dark:bg-[#0c0c1b]/50 backdrop-blur-2xl border border-white/20 dark:border-white/5 border-l-4 flex flex-col justify-between min-h-[92px]",
              stat.border
            )}>
              <div className="flex items-center gap-1.5 mb-2">
                <Icon 
                  strokeWidth={1.2} 
                  className={cn(
                    'size-4 shrink-0 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-110 group-hover:rotate-3', 
                    stat.color
                  )} 
                />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className={cn('text-2xl font-black tracking-tight leading-none mt-1', stat.color)}>{stat.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
