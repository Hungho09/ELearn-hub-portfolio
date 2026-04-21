'use client';

import { Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** Course card data type */
interface ContinueCourse {
  title: string;
  instructor: string;
  image: string;
  tag: string;
}

/** Static course data for continue watching section */
const continueCourses: ContinueCourse[] = [
  {
    title: 'Data Science',
    instructor: 'Sarah Williams',
    image: '/images/courses/data-science.png',
    tag: 'Popular',
  },
  {
    title: 'Machine Learning',
    instructor: 'James Chen',
    image: '/images/courses/machine-learning.png',
    tag: 'New',
  },
  {
    title: 'Mobile Development',
    instructor: 'Maria Garcia',
    image: '/images/courses/mobile-dev.png',
    tag: 'Trending',
  },
];

/**
 * ContinueWatching - Displays course cards with thumbnails and play overlays.
 * Each card shows course image, title, instructor, and a tag badge.
 */
export function ContinueWatching() {
  return (
    <section>
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Continue Watching</h2>
        <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
          See All
        </button>
      </div>

      {/* Course cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {continueCourses.map((course) => (
          <Card
            key={course.title}
            className="group overflow-hidden shadow-sm hover:shadow-md transition-shadow border-border/50 py-0 gap-0"
          >
            {/* Thumbnail with play overlay */}
            <div className="relative aspect-video overflow-hidden bg-muted">
              <img
                src={course.image}
                alt={course.title}
                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                <button className="flex size-10 items-center justify-center rounded-full bg-white/90 text-primary shadow-lg opacity-0 transition-all group-hover:opacity-100 hover:bg-white">
                  <Play className="size-4 fill-primary ml-0.5" />
                  <span className="sr-only">Play {course.title}</span>
                </button>
              </div>
              {/* Tag badge */}
              <Badge
                className={cn(
                  'absolute right-2 top-2 text-[10px] font-semibold',
                  course.tag === 'Popular' && 'bg-primary text-primary-foreground border-primary',
                  course.tag === 'New' && 'bg-emerald-500 text-white border-emerald-500',
                  course.tag === 'Trending' && 'bg-amber-500 text-white border-amber-500'
                )}
              >
                {course.tag}
              </Badge>
            </div>

            {/* Course details */}
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-foreground">{course.title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{course.instructor}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
