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
    <aside className="w-full lg:w-[280px] shrink-0">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-4 p-4">
          <ProfileCard />
          <ActivityChart />
          <MentorList />
        </div>
      </ScrollArea>
    </aside>
  );
}
