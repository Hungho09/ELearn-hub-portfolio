'use client';

import { BookOpen, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

/** Module data type */
interface Module {
  title: string;
  description: string;
  icon: React.ElementType;
  status: 'up-next' | 'locked' | 'completed';
}

/** Static module data */
const modules: Module[] = [
  {
    title: 'Business Idioms 101',
    description: 'Master professional expressions for the workplace.',
    icon: BookOpen,
    status: 'up-next',
  },
  {
    title: 'Public Speaking Mastery',
    description: 'Unlock after completing Unit 05.',
    icon: Lock,
    status: 'locked',
  },
];

/** Course completion percentage */
const COMPLETION_PERCENT = 65;

/**
 * CurriculumProgress - Shows course completion progress bar and module cards.
 * Displays overall progress and next modules to complete.
 */
export function CurriculumProgress() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Progress bar card */}
      <div className="col-span-2 bg-card p-4 md:p-6 rounded-xl border border-border/50 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg md:text-xl font-semibold text-foreground">
            Curriculum Progress
          </h3>
          <span className="text-primary font-bold text-sm">{COMPLETION_PERCENT}% Complete</span>
        </div>
        <Progress value={COMPLETION_PERCENT} className="h-3" />
      </div>

      {/* Module cards */}
      {modules.map((module) => {
        const Icon = module.icon;
        const isLocked = module.status === 'locked';
        const isUpNext = module.status === 'up-next';

        return (
          <Card
            key={module.title}
            className={`p-4 md:p-6 rounded-xl border shadow-sm transition-all cursor-pointer
              ${isLocked ? 'opacity-60' : 'hover:border-primary/30'}
            `}
          >
            <div className="flex items-start justify-between mb-3">
              <span
                className={`p-2 rounded-lg ${
                  isUpNext
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="size-5" />
              </span>
              {isUpNext && (
                <Badge className="bg-secondary text-secondary-foreground text-[10px] font-bold uppercase tracking-wider border-0">
                  Up Next
                </Badge>
              )}
            </div>
            <h4 className="text-sm font-medium text-foreground mb-1">{module.title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{module.description}</p>
          </Card>
        );
      })}
    </div>
  );
}
