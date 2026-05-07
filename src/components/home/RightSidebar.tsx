'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { ProfileCard } from './ProfileCard';
import { ActivityChart } from './ActivityChart';
import { MentorList } from './MentorList';

/**
 * RightSidebar - Combines ProfileCard, ActivityChart, and MentorList
 * into a single right sidebar panel.
 */
export function RightSidebar() {
  return (
    <aside className="w-[280px] h-full shrink-0">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-5 p-5">
          <ProfileCard />
          <ActivityChart />
          <MentorList />
        </div>
      </ScrollArea>
    </aside>
  );
}
