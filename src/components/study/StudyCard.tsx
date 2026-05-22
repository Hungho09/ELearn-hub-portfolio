'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Volume2, Lightbulb, SkipForward, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VocabCard {
  id: number;
  english: string;
  vietnamese: string;
  pronunciation: string | null;
  example_english: string | null;
  example_vietnamese: string | null;
  part_of_speech: string | null;
  category: string | null;
  difficulty_level: number;
  direction: 'en_to_vi' | 'vi_to_en';
}

interface StudyCardProps {
  card: VocabCard;
  userInput: string;
  showHint: boolean;
  submitting: boolean;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  onShowHint: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function StudyCard({
  card,
  userInput,
  showHint,
  submitting,
  onInputChange,
  onSubmit,
  onSkip,
  onShowHint,
  inputRef,
}: StudyCardProps) {
  const cardMode = card.direction;
  const promptText = cardMode === 'en_to_vi' ? card.english : card.vietnamese;
  const promptLabel = cardMode === 'en_to_vi' ? 'English' : 'Tiếng Việt';
  const answerLabel = cardMode === 'en_to_vi' ? 'Tiếng Việt' : 'English';
  const promptPronunciation = cardMode === 'en_to_vi' ? null : card.pronunciation;
  const correctAnswer = cardMode === 'en_to_vi' ? card.vietnamese : card.english;
  const hintLetter = correctAnswer ? correctAnswer[0] + '...' : '';

  return (
    <div className="space-y-4">
      {/* Direction badge & info */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs font-medium gap-1.5">
          <Languages className="size-3" />
          {cardMode === 'en_to_vi' ? 'EN → VI' : 'VI → EN'}
        </Badge>
        <div className="flex items-center gap-2">
          {card.category && (
            <Badge variant="outline" className="text-xs">{card.category}</Badge>
          )}
          {card.difficulty_level > 0 && (
            <Badge variant="secondary" className="text-xs">
              {'⭐'.repeat(card.difficulty_level)}
            </Badge>
          )}
        </div>
      </div>

      {/* Prompt Card */}
      <Card variant="glass" className="relative overflow-hidden border-white/20 dark:border-white/10 bg-white/10 dark:bg-card/25 backdrop-blur-2xl shadow-2xl transition-all duration-500 hover:shadow-primary/15 hover:border-primary/40 group">
        {/* Light-catch edge overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none group-hover:via-white/10 group-hover:to-white/25 transition-all duration-500" />

        {/* Decorative circles - animated */}
        <div className="absolute top-0 right-0 size-32 bg-primary/8 rounded-full -translate-y-1/2 translate-x-1/2 animate-float [animation-duration:6s] blur-md" />
        <div className="absolute bottom-0 left-0 size-24 bg-primary/8 rounded-full translate-y-1/2 -translate-x-1/2 animate-float [animation-duration:5s] [animation-delay:1s] blur-md" />

        <CardContent className="relative p-6 md:p-8">
          <div className="flex flex-col items-center gap-6 animate-in fade-in duration-300">
            {/* Word prompt */}
            <div className="text-center">
              <Badge variant="secondary" className="mb-3 bg-primary/15 text-primary border border-primary/20 backdrop-blur-md">{promptLabel}</Badge>
              <h2 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text">
                {promptText}
              </h2>
              {promptPronunciation && (
                <p className="text-lg text-muted-foreground flex items-center gap-2 justify-center mt-2 font-medium">
                  <Volume2 className="size-4 text-primary" />/{promptPronunciation}/
                </p>
              )}
              {card.part_of_speech && (
                <Badge variant="outline" className="text-xs capitalize mt-2 border-white/20 dark:border-white/10 bg-white/5 backdrop-blur-md">
                  {card.part_of_speech}
                </Badge>
              )}
            </div>

            {/* Input area */}
            <div className="w-full max-w-md space-y-4">
              <div className="relative">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder={`Type in ${answerLabel}...`}
                  value={userInput}
                  onChange={(e) => onInputChange(e.target.value)}
                  className="h-14 text-lg text-center px-4 rounded-xl border-2 border-white/10 bg-white/5 focus:bg-white/10 dark:bg-black/20 dark:focus:bg-black/35 focus:border-primary/50 transition-all duration-300 placeholder:text-muted-foreground/60 shadow-inner"
                  disabled={submitting}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                {userInput && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 size-8 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-full"
                    onClick={() => onInputChange('')}
                  >
                    ×
                  </Button>
                )}
              </div>

              {/* Hint & Skip */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!showHint ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onShowHint}
                      className="gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300"
                    >
                      <Lightbulb className="size-3.5" />
                      Show hint
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-xs gap-1 py-1 border-primary/20 bg-primary/5 text-primary">
                      <Lightbulb className="size-3" />
                      Starts with: <span className="font-semibold">{hintLetter}</span>
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSkip}
                  disabled={submitting}
                  className="gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all duration-300"
                >
                  <SkipForward className="size-3.5" />
                  Skip
                </Button>
              </div>

              {/* Check button */}
              <Button
                onClick={onSubmit}
                disabled={!userInput.trim() || submitting}
                className="w-full h-12 text-base font-semibold rounded-xl gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/35 transition-all duration-300"
                size="lg"
              >
                {submitting ? (
                  <div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    Check
                    <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 border border-white/30 rounded text-[11px]">↵</kbd>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keyboard shortcuts hint */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span>
          <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] shadow-[inset_0_1px_0_hsla(var(--background)/0.5)]">Enter</kbd> Check / Continue
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] shadow-[inset_0_1px_0_hsla(var(--background)/0.5)]">Esc</kbd> Skip card
        </span>
      </div>
    </div>
  );
}
