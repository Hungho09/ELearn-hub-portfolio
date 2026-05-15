'use client';

import { Play, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * HeroBanner - Modern gradient banner with animated glassmorphism decorations and CTA.
 * Features floating blobs, sparkle/star animations, and a "Join Now" button with glow.
 */
export function HeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-[#A29BFE] p-6 md:p-8 text-white">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Radial gradient overlay for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(255,255,255,0.08),transparent_60%)]" />

        {/* Floating circle decorations */}
        <div className="absolute -right-10 -top-10 size-44 rounded-full bg-white/10 animate-float [animation-duration:5s]" />
        <div className="absolute -right-4 top-16 size-24 rounded-full bg-white/5 animate-float [animation-duration:7s] [animation-delay:1s]" />
        <div className="absolute right-32 -bottom-8 size-20 rounded-full bg-white/10 animate-float [animation-duration:6s] [animation-delay:2s]" />

        {/* Sparkle decorations with subtle animation */}
        <Sparkles className="absolute right-[15%] top-[20%] size-5 text-white/30 animate-pulse" />
        <Star className="absolute right-[25%] top-[60%] size-4 text-white/25 animate-pulse [animation-delay:0.5s]" />
        <Star className="absolute right-[10%] bottom-[25%] size-3 text-white/20 fill-white/20 animate-pulse [animation-delay:1s]" />
        <Sparkles className="absolute left-[55%] top-[15%] size-3 text-white/20 animate-pulse [animation-delay:1.5s]" />
        <Star className="absolute left-[45%] bottom-[20%] size-3 text-white/15 fill-white/15 animate-pulse [animation-delay:2s]" />

        {/* Small dots */}
        <div className="absolute right-[40%] top-[30%] size-1.5 rounded-full bg-white/30 animate-pulse" />
        <div className="absolute right-[20%] top-[45%] size-1 rounded-full bg-white/25 animate-pulse [animation-delay:0.7s]" />
        <div className="absolute right-[35%] bottom-[35%] size-1.5 rounded-full bg-white/20 animate-pulse [animation-delay:1.3s]" />
        <div className="absolute left-[70%] top-[50%] size-1 rounded-full bg-white/15 animate-pulse [animation-delay:1.8s]" />
      </div>

      {/* Glassmorphism content area */}
      <div className="relative z-10 md:pr-48 lg:pr-56">
        <div className="backdrop-blur-sm bg-white/5 rounded-xl p-1 -m-1 inline-block">
          <h1 className="mb-3 text-xl font-bold leading-tight md:text-2xl lg:text-[1.65rem]">
            Sharpen Your Skills With Professional Online Courses
          </h1>
        </div>
        <p className="mb-5 text-sm text-white/80 leading-relaxed max-w-sm">
          Learn at your own pace with expert mentors and a community of learners. Build real-world skills that matter.
        </p>
        <Button
          className="bg-white text-primary hover:bg-white/90 hover:scale-[1.02] font-semibold shadow-[0_0_20px_rgba(108,92,231,0.3)] hover:shadow-[0_0_28px_rgba(108,92,231,0.4)] gap-2 h-11 px-6 transition-all duration-[var(--duration-normal)] ease-[var(--ease-out)]"
          size="lg"
        >
          <Play className="size-4 fill-primary" />
          Join Now
        </Button>
      </div>

      {/* Hero illustration - positioned on the right with float animation */}
      <div className="absolute right-0 bottom-0 hidden md:block md:w-44 lg:w-56 animate-float [animation-duration:4s]">
        <img
          src="/images/hero-illustration.png"
          alt="Learning illustration"
          className="w-full object-contain drop-shadow-lg translate-y-2"
        />
      </div>
    </div>
  );
}
