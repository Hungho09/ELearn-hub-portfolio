'use client';

import { Play, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** Course card data type */
interface ContinueCourse {
  title: string;
  instructor: string;
  image: string;
  tag: string;
  duration: string;
}

/** Static course data for continue watching section */
const continueCourses: ContinueCourse[] = [
  {
    title: 'Data Science',
    instructor: 'Sarah Williams',
    image: '/images/courses/data-science.png',
    tag: 'Popular',
    duration: '2h 30m',
  },
  {
    title: 'Machine Learning',
    instructor: 'James Chen',
    image: '/images/courses/machine-learning.png',
    tag: 'New',
    duration: '3h 15m',
  },
  {
    title: 'Mobile Development',
    instructor: 'Maria Garcia',
    image: '/images/courses/mobile-dev.png',
    tag: 'Trending',
    duration: '1h 45m',
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
        <button className="rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
          See All
        </button>
      </div>

      {/* Course cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {continueCourses.map((course) => (
          <Card
            key={course.title}
            className="group overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border-border/50 py-0 gap-0 cursor-pointer"
          >
            {/* Thumbnail with play overlay */}
            <div className="relative aspect-video overflow-hidden bg-muted">
              <img
                src={course.image}
                alt={course.title}
                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/25">
                <button className="flex size-12 items-center justify-center rounded-full bg-white/90 text-primary shadow-lg opacity-0 scale-90 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 hover:bg-white">
                  <Play className="size-5 fill-primary ml-0.5" />
                  <span className="sr-only">Play {course.title}</span>
                </button>
              </div>
              {/* Tag badge */}
              <Badge
                className={cn(
                  'absolute right-2 top-2 text-[10px] font-semibold border-0',
                  course.tag === 'Popular' && 'bg-primary text-white',
                  course.tag === 'New' && 'bg-emerald-500 text-white',
                  course.tag === 'Trending' && 'bg-amber-500 text-white'
                )}
              >
                {course.tag}
              </Badge>
              {/* Duration */}
              <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                <Clock className="size-2.5" />
                {course.duration}
              </div>
            </div>

            {/* Course details */}
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{course.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{course.instructor}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
