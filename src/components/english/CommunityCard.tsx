'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

/** Peer data for community card */
const peers = [
  { name: 'Peer 1', image: '/images/mentors/mentor1.png' },
  { name: 'Peer 2', image: '/images/mentors/mentor2.png' },
  { name: 'Peer 3', image: '/images/mentors/mentor3.png' },
];

/**
 * CommunityCard - Shows community learning stats with peer avatars.
 * Displays how many others are currently learning the same course.
 */
export function CommunityCard() {
  return (
    <Card className="shadow-sm border-border/50 py-0 gap-0">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center gap-3">
          {/* Overlapping peer avatars */}
          <div className="flex -space-x-2">
            {peers.map((peer, index) => (
              <Avatar
                key={peer.name}
                className="size-8 border-2 border-white bg-muted"
                style={{ zIndex: peers.length - index }}
              >
                <AvatarImage src={peer.image} alt={peer.name} />
                <AvatarFallback className="text-[10px]">
                  {peer.name.split(' ')[1]}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            128 others learning this now
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
