'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** Activity data for each day of the week */
interface DayActivity {
  day: string;
  hours: number;
}

/** Static weekly activity data */
const weeklyActivity: DayActivity[] = [
  { day: 'Mon', hours: 3 },
  { day: 'Tue', hours: 5 },
  { day: 'Wed', hours: 2 },
  { day: 'Thu', hours: 7 },
  { day: 'Fri', hours: 4 },
  { day: 'Sat', hours: 6 },
  { day: 'Sun', hours: 3 },
];

/** Maximum activity hours for scaling bars */
const maxHours = Math.max(...weeklyActivity.map((d) => d.hours));

/**
 * ActivityChart - Weekly activity bar chart using simple divs.
 * Shows learning activity hours for each day of the week.
 */
export function ActivityChart() {
  return (
    <Card className="shadow-sm border-border/50 py-0 gap-0">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-semibold">Activity This Week</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-end justify-between gap-2" style={{ height: '120px' }}>
          {weeklyActivity.map((activity) => {
            const heightPercent = (activity.hours / maxHours) * 100;

            return (
              <div
                key={activity.day}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                {/* Bar */}
                <div className="relative w-full flex justify-center" style={{ height: '90px' }}>
                  <div
                    className={cn(
                      'w-full max-w-[24px] rounded-t-md transition-all duration-300',
                      'bg-gradient-to-t from-primary to-[#A29BFE]',
                      'hover:from-primary/90 hover:to-[#A29BFE]/90'
                    )}
                    style={{ height: `${heightPercent}%`, marginTop: 'auto' }}
                    title={`${activity.hours} hours`}
                  />
                </div>
                {/* Day label */}
                <span className="text-[10px] font-medium text-muted-foreground">
                  {activity.day}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
