'use client';

import { Mic, BookMarked, Brain, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/** Recommendation data type */
interface Recommendation {
  type: string;
  typeColor: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  image?: string;
}

/** Static recommendation data */
const recommendations: Recommendation[] = [
  {
    type: 'Practice',
    typeColor: 'text-primary',
    title: 'Shadowing: Pronunciation Lab',
    description: 'Based on your Unit 04 performance.',
    icon: Mic,
    iconBg: 'bg-secondary',
  },
  {
    type: 'Review',
    typeColor: 'text-secondary-foreground',
    title: 'Idiom Flashcards: Business',
    description: 'Review items you missed yesterday.',
    icon: BookMarked,
    iconBg: 'bg-muted',
  },
  {
    type: 'Challenge',
    typeColor: 'text-primary',
    title: 'AI 1:1 Live Conversation',
    description: '3 mins session available now.',
    icon: Brain,
    iconBg: 'bg-secondary',
    image: '/images/english/ai-coach.png',
  },
];

/**
 * AIRecommendations - AI-powered study recommendations sidebar.
 * Shows personalized suggestions based on learning progress.
 */
export function AIRecommendations() {
  return (
    <Card
      className="py-0 gap-0 shadow-sm backdrop-blur-[10px] border-border/50"
      style={{
        background: 'rgba(255, 255, 255, 0.7)',
        border: '1px solid rgba(108, 92, 231, 0.1)',
      }}
    >
      <CardContent className="p-4 md:p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="size-4 text-primary fill-primary" />
          <h3 className="text-sm font-bold text-foreground">AI Recommendations</h3>
        </div>

        {/* Recommendation items */}
        <div className="space-y-3">
          {recommendations.map((rec) => {
            const Icon = rec.icon;

            return (
              <div
                key={rec.title}
                className="group flex gap-3 p-2 rounded-lg hover:bg-white/50 transition-all cursor-pointer border border-transparent hover:border-primary/10"
              >
                {/* Icon or image */}
                {rec.image ? (
                  <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0">
                    <img
                      src={rec.image}
                      alt={rec.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className={`w-14 h-14 rounded-lg ${rec.iconBg} shrink-0 flex items-center justify-center`}>
                    <Icon className="size-5 text-primary" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${rec.typeColor} mb-1`}>
                    {rec.type}
                  </p>
                  <h4 className="text-sm font-medium text-foreground leading-tight">{rec.title}</h4>
                  <p className="text-[11px] text-muted-foreground mt-1">{rec.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* View study plan button */}
        <Button
          variant="outline"
          className="w-full mt-4 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-bold transition-all h-9"
        >
          View Study Plan
        </Button>
      </CardContent>
    </Card>
  );
}
