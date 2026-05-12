'use client';

import { Play, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * HeroBanner - Purple gradient banner with decorative elements and CTA.
 * Features sparkle/star decorations and a "Join Now" button.
 */
export function HeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-[#A29BFE] p-6 md:p-8 text-white">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Large circle decoration */}
        <div className="absolute -right-10 -top-10 size-44 rounded-full bg-white/10" />
        <div className="absolute -right-4 top-16 size-24 rounded-full bg-white/5" />
        <div className="absolute right-32 -bottom-8 size-20 rounded-full bg-white/10" />

        {/* Sparkle decorations */}
        <Sparkles className="absolute right-[15%] top-[20%] size-5 text-white/30" />
        <Star className="absolute right-[25%] top-[60%] size-4 text-white/25" />
        <Star className="absolute right-[10%] bottom-[25%] size-3 text-white/20 fill-white/20" />
        <Sparkles className="absolute left-[55%] top-[15%] size-3 text-white/20" />
        <Star className="absolute left-[45%] bottom-[20%] size-3 text-white/15 fill-white/15" />

        {/* Small dots */}
        <div className="absolute right-[40%] top-[30%] size-1.5 rounded-full bg-white/30" />
        <div className="absolute right-[20%] top-[45%] size-1 rounded-full bg-white/25" />
        <div className="absolute right-[35%] bottom-[35%] size-1.5 rounded-full bg-white/20" />
        <div className="absolute left-[70%] top-[50%] size-1 rounded-full bg-white/15" />
      </div>

      {/* Content */}
      <div className="relative z-10 md:pr-48 lg:pr-56">
        <h1 className="mb-3 text-xl font-bold leading-tight md:text-2xl lg:text-[1.65rem]">
          Sharpen Your Skills With Professional Online Courses
        </h1>
        <p className="mb-5 text-sm text-white/80 leading-relaxed max-w-sm">
          Learn at your own pace with expert mentors and a community of learners. Build real-world skills that matter.
        </p>
        <Button
          className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg shadow-black/10 gap-2 h-11 px-6"
          size="lg"
        >
          <Play className="size-4 fill-primary" />
          Join Now
        </Button>
      </div>

      {/* Hero illustration - positioned on the right */}
      <div className="absolute right-0 bottom-0 hidden md:block md:w-44 lg:w-56">
        <img
          src="/images/hero-illustration.png"
          alt="Learning illustration"
          className="w-full object-contain drop-shadow-lg translate-y-2"
        />
      </div>
    </div>
  );
}
