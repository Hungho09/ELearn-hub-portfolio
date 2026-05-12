'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

/** Mentor data type */
interface Mentor {
  name: string;
  title: string;
  image: string;
  followed?: boolean;
}

/** Static mentor data */
const mentors: Mentor[] = [
  {
    name: 'Dr. Emily Carter',
    title: 'Data Science Expert',
    image: '/images/mentors/mentor1.png',
    followed: false,
  },
  {
    name: 'Prof. David Kim',
    title: 'ML & AI Specialist',
    image: '/images/mentors/mentor2.png',
    followed: true,
  },
  {
    name: 'Lisa Zhang',
    title: 'UX Design Lead',
    image: '/images/mentors/mentor3.png',
    followed: false,
  },
];

/**
 * MentorList - Displays a list of mentor cards with follow buttons.
 * Each card shows mentor avatar, name, title, and follow action.
 */
export function MentorList() {
  return (
    <Card className="shadow-sm border-border/50 py-0 gap-0">
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-sm font-semibold">Your Mentor</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex flex-col gap-2.5">
          {mentors.map((mentor) => (
            <div
              key={mentor.name}
              className="flex items-center gap-3 rounded-lg p-2 -mx-1 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              {/* Mentor avatar */}
              <Avatar className="size-10 shrink-0 ring-2 ring-border">
                <AvatarImage src={mentor.image} alt={mentor.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {mentor.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>

              {/* Mentor info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">
                  {mentor.name}
                </p>
                <p className="truncate text-[10px] text-muted-foreground mt-0.5">
                  {mentor.title}
                </p>
              </div>

              {/* Follow button */}
              <Button
                variant={mentor.followed ? 'secondary' : 'default'}
                size="sm"
                className={`h-7 shrink-0 px-3 text-[11px] font-medium ${
                  mentor.followed
                    ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {mentor.followed ? 'Following' : 'Follow'}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
