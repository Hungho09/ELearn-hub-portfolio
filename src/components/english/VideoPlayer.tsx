'use client';

import { useState } from 'react';
import { Play, Heart, Share2, Bookmark, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

/**
 * VideoPlayer - Large video player area with placeholder thumbnail,
 * play overlay, video metadata, and action buttons.
 */
export function VideoPlayer() {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="space-y-4">
      {/* Video Player Area */}
      <div
        className="relative w-full overflow-hidden rounded-xl bg-gradient-to-br from-primary/80 to-primary shadow-lg cursor-pointer group"
        style={{ aspectRatio: '16/9' }}
        onClick={() => setIsPlaying(!isPlaying)}
      >
        {/* Decorative pattern overlay */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-6 left-8 size-16 rounded-full border-2 border-white/40" />
          <div className="absolute bottom-10 right-12 size-24 rounded-full border-2 border-white/30" />
          <div className="absolute top-1/2 left-1/3 size-8 rounded-full bg-white/20" />
          <div className="absolute top-1/4 right-1/4 size-6 rounded-full bg-white/15" />
        </div>

        {/* Lesson number badge */}
        <div className="absolute top-4 left-4 z-10">
          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm hover:bg-white/30">
            Lesson 1 of 24
          </Badge>
        </div>

        {/* Play/Pause button overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              'flex size-16 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/35 group-hover:scale-110',
              isPlaying && 'opacity-0 group-hover:opacity-100'
            )}
          >
            {isPlaying ? (
              <div className="flex gap-1.5">
                <div className="w-1.5 h-6 bg-white rounded-full" />
                <div className="w-1.5 h-6 bg-white rounded-full" />
              </div>
            ) : (
              <Play className="size-7 text-white fill-white ml-1" />
            )}
          </div>
        </div>

        {/* Bottom progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div className="h-full w-1/3 bg-white/80 rounded-r-full transition-all" />
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-4 right-4 z-10">
          <Badge variant="secondary" className="bg-black/50 text-white border-0 backdrop-blur-sm text-xs">
            12:34 / 38:20
          </Badge>
        </div>
      </div>

      {/* Video Info */}
      <div className="space-y-3">
        <h1 className="text-xl font-bold text-foreground leading-snug">
          English for Beginners - Lesson 1: Greetings &amp; Introductions
        </h1>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">SM</span>
            </div>
            <span className="font-medium text-foreground">Sarah Mitchell</span>
          </div>
          <span className="text-border">|</span>
          <span>Mar 4, 2025</span>
          <span className="text-border">|</span>
          <span>38 min</span>
          <Badge variant="secondary" className="ml-1">Beginner</Badge>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'gap-1.5 text-muted-foreground hover:text-foreground',
              liked && 'text-destructive hover:text-destructive'
            )}
            onClick={() => setLiked(!liked)}
          >
            <Heart className={cn('size-4', liked && 'fill-destructive')} />
            <span className="text-xs font-medium">{liked ? 'Liked' : 'Like'}</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
            <Share2 className="size-4" />
            <span className="text-xs font-medium">Share</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'gap-1.5 text-muted-foreground hover:text-foreground',
              bookmarked && 'text-primary hover:text-primary'
            )}
            onClick={() => setBookmarked(!bookmarked)}
          >
            <Bookmark className={cn('size-4', bookmarked && 'fill-primary')} />
            <span className="text-xs font-medium">{bookmarked ? 'Saved' : 'Save'}</span>
          </Button>
          <div className="flex-1" />
          <Button size="sm" className="gap-1.5">
            <CheckCircle className="size-4" />
            <span>Mark Complete</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
