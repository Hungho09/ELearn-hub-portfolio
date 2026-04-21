'use client';

import { Play, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * HeroBanner - Purple gradient banner with decorative elements and CTA.
 * Features sparkle/star decorations and a "Join Now" button.
 */
export function HeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-[#A29BFE] p-6 md:p-8 text-white">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Large circle decoration */}
        <div className="absolute -right-8 -top-8 size-40 rounded-full bg-white/10" />
        <div className="absolute -right-4 top-16 size-24 rounded-full bg-white/5" />
        <div className="absolute right-32 -bottom-6 size-20 rounded-full bg-white/10" />

        {/* Sparkle decorations */}
        <Sparkles className="absolute right-[15%] top-[20%] size-5 text-white/30" />
        <Star className="absolute right-[25%] top-[60%] size-4 text-white/25" />
        <Star className="absolute right-[10%] bottom-[25%] size-3 text-white/20 fill-white/20" />
        <Sparkles className="absolute left-[60%] top-[15%] size-3 text-white/20" />

        {/* Small dots */}
        <div className="absolute right-[40%] top-[30%] size-1.5 rounded-full bg-white/30" />
        <div className="absolute right-[20%] top-[45%] size-1 rounded-full bg-white/25" />
        <div className="absolute right-[35%] bottom-[35%] size-1.5 rounded-full bg-white/20" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-md">
        <h1 className="mb-3 text-xl font-bold leading-tight md:text-2xl lg:text-[1.65rem]">
          Sharpen Your Skills With Professional Online Courses
        </h1>
        <p className="mb-5 text-sm text-white/80 leading-relaxed">
          Learn at your own pace with expert mentors and a community of learners. Build real-world skills that matter.
        </p>
        <Button
          className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg shadow-primary/30 gap-2"
          size="lg"
        >
          <Play className="size-4 fill-primary" />
          Join Now
        </Button>
      </div>

      {/* Hero illustration */}
      <div className="absolute right-2 bottom-0 hidden md:block md:w-44 lg:w-52">
        <img
          src="/images/hero-illustration.png"
          alt="Learning illustration"
          className="w-full object-contain drop-shadow-lg"
        />
      </div>
    </div>
  );
}
