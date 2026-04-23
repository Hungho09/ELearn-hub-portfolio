'use client';

import { Star, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

/** Related course type */
interface RelatedCourse {
  id: number;
  title: string;
  instructor: string;
  thumbnail: string;
  rating: number;
  students: number;
  progress: number;
  level: string;
}

/** Mock related courses */
const relatedCourses: RelatedCourse[] = [
  {
    id: 1,
    title: 'English Grammar Masterclass',
    instructor: 'Prof. James Wilson',
    thumbnail: '/images/courses/web-dev.png',
    rating: 4.8,
    students: 2340,
    progress: 0,
    level: 'Intermediate',
  },
  {
    id: 2,
    title: 'Business English Essentials',
    instructor: 'Dr. Lisa Park',
    thumbnail: '/images/courses/data-science.png',
    rating: 4.6,
    students: 1890,
    progress: 35,
    level: 'Intermediate',
  },
  {
    id: 3,
    title: 'English Pronunciation Pro',
    instructor: 'Sarah Mitchell',
    thumbnail: '/images/courses/product-design.png',
    rating: 4.9,
    students: 3120,
    progress: 0,
    level: 'Beginner',
  },
];

/**
 * RelatedCourses - Displays 2-3 small course cards
 * for related courses the user might be interested in.
 */
export function RelatedCourses() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Related Courses</h3>
      <div className="space-y-2.5">
        {relatedCourses.map((course) => (
          <Card
            key={course.id}
            className="border-border overflow-hidden cursor-pointer hover:border-primary/30 transition-colors group"
          >
            <CardContent className="p-0">
              <div className="flex gap-3 p-3">
                {/* Thumbnail */}
                <div className="relative size-16 shrink-0 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">
                    {course.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {course.instructor}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center gap-0.5">
                      <Star className="size-3 text-amber-500 fill-amber-500" />
                      <span className="text-[10px] font-semibold text-foreground">
                        {course.rating}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Users className="size-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        {course.students.toLocaleString()}
                      </span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary hover:bg-primary/10"
                    >
                      {course.level}
                    </Badge>
                  </div>

                  {/* Progress bar if started */}
                  {course.progress > 0 && (
                    <div className="mt-1.5">
                      <Progress value={course.progress} className="h-1" />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
