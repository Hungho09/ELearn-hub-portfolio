'use client';

import { Bell } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

/** Course progress data type */
interface CourseProgress {
  name: string;
  image: string;
  watched: number;
  total: number;
  color: string;
}

/** Static course progress data */
const courses: CourseProgress[] = [
  {
    name: 'UI/UX Design',
    image: '/images/courses/ui-design.png',
    watched: 2,
    total: 8,
    color: 'bg-primary',
  },
  {
    name: 'Web Development',
    image: '/images/courses/web-dev.png',
    watched: 2,
    total: 8,
    color: 'bg-emerald-500',
  },
  {
    name: 'Product Design',
    image: '/images/courses/product-design.png',
    watched: 2,
    total: 8,
    color: 'bg-amber-500',
  },
];

/**
 * CourseProgressCards - Displays three cards showing course watch progress.
 * Each card includes thumbnail, name, progress text, and a progress bar.
 */
export function CourseProgressCards() {
  return (
    <section>
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Online Course</h2>
        <button className="rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
          See All
        </button>
      </div>

      {/* Course progress cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => {
          const progressPercent = Math.round((course.watched / course.total) * 100);

          return (
            <Card
              key={course.name}
              className="shadow-sm hover:shadow-md transition-all duration-200 border-border/50 py-0 gap-0 cursor-pointer group"
            >
              <CardContent className="flex items-center gap-3.5 p-4">
                {/* Course thumbnail */}
                <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                  <img
                    src={course.image}
                    alt={course.name}
                    className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                </div>

                {/* Course info and progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-foreground">
                      {course.name}
                    </h3>
                    <button className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                      <Bell className="size-3.5" />
                      <span className="sr-only">Notifications for {course.name}</span>
                    </button>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {course.watched}/{course.total} Watched
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={progressPercent} className="h-1.5 flex-1" />
                    <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                      {progressPercent}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
