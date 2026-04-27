'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RotateCcw,
  Star,
  Brain,
  BookOpen,
  Clock,
  Flame,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Zap,
  Volume2,
  Eye,
  EyeOff,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Sidebar } from '@/components/home/Sidebar';
import { SearchBar } from '@/components/home/SearchBar';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────

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
}

interface FlashcardSessionData {
  due_cards: VocabCard[];
  new_cards: VocabCard[];
  total_due: number;
  total_new: number;
  total_learned: number;
}

interface UserStatsData {
  total_reviews: number;
  total_unique_words: number;
  average_ease_factor: number;
  words_mastered: number;
  words_learning: number;
  words_new: number;
  streak_days: number;
  reviews_today: number;
}

interface ReviewResult {
  vocabulary_id: number;
  rating: number;
  new_interval_days: number;
  new_ease_factor: number;
  new_repetitions: number;
  next_review_at: string | null;
}

type CardMode = 'en_to_vi' | 'vi_to_en';
type CardState = 'front' | 'back';
type PageView = 'session' | 'complete';

// ─── API Helpers ──────────────────────────────────────────────────

async function getSession(userId: string, limit = 20): Promise<FlashcardSessionData> {
  const res = await fetch(`/api/flashcards/session?user_id=${encodeURIComponent(userId)}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch session');
  return res.json();
}

async function submitReview(userId: string, vocabId: number, rating: number, direction: string, responseTimeMs?: number): Promise<ReviewResult> {
  const res = await fetch(`/api/flashcards/review?user_id=${encodeURIComponent(userId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vocabulary_id: vocabId,
      rating,
      direction,
      response_time_ms: responseTimeMs,
    }),
  });
  if (!res.ok) throw new Error('Failed to submit review');
  return res.json();
}

async function getStats(userId: string): Promise<UserStatsData> {
  const res = await fetch(`/api/flashcards/stats?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

// ─── Rating Button Data ──────────────────────────────────────────

const RATINGS = [
  { value: 1, label: 'Again', sublabel: '<1m', color: 'bg-red-500 hover:bg-red-600', icon: XCircle, textColor: 'text-red-500' },
  { value: 2, label: 'Hard', sublabel: '<6m', color: 'bg-orange-500 hover:bg-orange-600', icon: Zap, textColor: 'text-orange-500' },
  { value: 3, label: 'Good', sublabel: '<1d', color: 'bg-emerald-500 hover:bg-emerald-600', icon: CheckCircle2, textColor: 'text-emerald-500' },
  { value: 4, label: 'Easy', sublabel: '<4d', color: 'bg-blue-500 hover:bg-blue-600', icon: Star, textColor: 'text-blue-500' },
];

// ─── Main Component ──────────────────────────────────────────────

export default function FlashcardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Card state
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardState, setCardState] = useState<CardState>('front');
  const [cardMode, setCardMode] = useState<CardMode>('en_to_vi');
  const [pageView, setPageView] = useState<PageView>('session');
  const [showExample, setShowExample] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);

  // Stats
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0, total: 0 });

  // Loading states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timing
  const [cardStartTime, setCardStartTime] = useState<number>(Date.now());

  const userId = session?.user?.id || session?.user?.email || 'guest';

  // ─── Load session data ────────────────────────────────────
  const loadSession = useCallback(async () => {
    if (status === 'loading') return;
    try {
      setLoading(true);
      setError(null);
      const uid = userId || 'guest';
      const data = await getSession(uid, 20);

      // Mix due cards and new cards - due first
      const allCards = [...data.due_cards, ...data.new_cards];
      setCards(allCards);
      setCurrentIndex(0);
      setCardState('front');
      setPageView(allCards.length > 0 ? 'session' : 'complete');
      setSessionStats({ correct: 0, wrong: 0, total: 0 });
      setCardStartTime(Date.now());

      // Load stats
      try {
        const statsData = await getStats(uid);
        setStats(statsData);
      } catch {
        // Stats are optional
      }
    } catch (err) {
      setError('Failed to load flashcards. Please try again.');
      console.error('Session load error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, status]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // ─── Card actions ─────────────────────────────────────────
  const currentCard = cards[currentIndex] as VocabCard | undefined;

  const handleFlip = useCallback(() => {
    if (cardState === 'front') {
      setIsFlipping(true);
      setTimeout(() => {
        setCardState('back');
        setIsFlipping(false);
      }, 150);
    }
  }, [cardState]);

  const handleRate = useCallback(async (rating: number) => {
    if (!currentCard || submitting) return;

    const responseTime = Date.now() - cardStartTime;
    setSubmitting(true);

    try {
      const uid = userId || 'guest';
      await submitReview(uid, currentCard.id, rating, cardMode, responseTime);

      // Update session stats
      setSessionStats(prev => ({
        correct: prev.correct + (rating >= 3 ? 1 : 0),
        wrong: prev.wrong + (rating < 3 ? 1 : 0),
        total: prev.total + 1,
      }));

      // Move to next card
      if (currentIndex + 1 < cards.length) {
        setCurrentIndex(prev => prev + 1);
        setCardState('front');
        setShowExample(false);
        setCardStartTime(Date.now());
      } else {
        // Session complete
        setPageView('complete');
        // Refresh stats
        try {
          const statsData = await getStats(uid);
          setStats(statsData);
        } catch { /* ignore */ }
      }
    } catch (err) {
      console.error('Review submit error:', err);
      setError('Failed to save review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [currentCard, submitting, cardStartTime, userId, cardMode, currentIndex, cards.length]);

  const handleRestart = useCallback(() => {
    loadSession();
  }, [loadSession]);

  const toggleMode = useCallback(() => {
    setCardMode(prev => prev === 'en_to_vi' ? 'vi_to_en' : 'en_to_vi');
    setCardState('front');
    setShowExample(false);
  }, []);

  // ─── Keyboard shortcuts ───────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          if (cardState === 'front') handleFlip();
          break;
        case '1': if (cardState === 'back') handleRate(1); break;
        case '2': if (cardState === 'back') handleRate(2); break;
        case '3': if (cardState === 'back') handleRate(3); break;
        case '4': if (cardState === 'back') handleRate(4); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cardState, handleFlip, handleRate]);

  // ─── Computed values ──────────────────────────────────────
  const progressPercent = cards.length > 0 ? ((currentIndex) / cards.length) * 100 : 0;
  const isFront = cardState === 'front';
  const frontText = cardMode === 'en_to_vi' ? currentCard?.english : currentCard?.vietnamese;
  const backText = cardMode === 'en_to_vi' ? currentCard?.vietnamese : currentCard?.english;
  const frontLabel = cardMode === 'en_to_vi' ? 'English' : 'Tiếng Việt';
  const backLabel = cardMode === 'en_to_vi' ? 'Tiếng Việt' : 'English';
  const frontPronunciation = cardMode === 'en_to_vi' ? null : currentCard?.pronunciation;
  const backPronunciation = cardMode === 'en_to_vi' ? currentCard?.pronunciation : null;

  // ─── Render ───────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Left Sidebar */}
        <div className="hidden md:block shrink-0">
          <Sidebar collapsed={false} />
        </div>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-[260px]">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <Sidebar collapsed={false} onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="mx-auto max-w-4xl p-5 md:p-6 lg:p-8">
            {/* Top Bar */}
            <SearchBar onMobileMenuToggle={() => setMobileMenuOpen(prev => !prev)} />

            {/* Header */}
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
                  <ArrowLeft className="size-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Brain className="size-6 text-primary" />
                    Flashcard
                  </h1>
                  <p className="text-sm text-muted-foreground">Learn English ↔ Vietnamese vocabulary</p>
                </div>
              </div>
              {stats && (
                <div className="hidden sm:flex items-center gap-3">
                  <Badge variant="secondary" className="gap-1">
                    <Flame className="size-3 text-orange-500" />
                    {stats.streak_days} day streak
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <BookOpen className="size-3 text-primary" />
                    {stats.reviews_today} today
                  </Badge>
                </div>
              )}
            </div>

            {/* Stats Bar */}
            {stats && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-l-4 border-l-primary">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Mastered</p>
                    <p className="text-xl font-bold text-primary">{stats.words_mastered}</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-500">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Learning</p>
                    <p className="text-xl font-bold text-emerald-600">{stats.words_learning}</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">New</p>
                    <p className="text-xl font-bold text-amber-600">{stats.words_new}</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Total Reviews</p>
                    <p className="text-xl font-bold text-purple-600">{stats.total_reviews}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Progress Bar */}
            {pageView === 'session' && cards.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <span>Card {currentIndex + 1} of {cards.length}</span>
                  <span>{Math.round(progressPercent)}% complete</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
                {error}
                <Button variant="link" size="sm" onClick={() => setError(null)} className="ml-2">
                  Dismiss
                </Button>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="mt-12 flex flex-col items-center justify-center gap-4">
                <div className="size-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground">Loading flashcards...</p>
              </div>
            )}

            {/* ─── Session View ─────────────────────────── */}
            {!loading && pageView === 'session' && currentCard && (
              <div className="mt-6">
                {/* Mode Toggle & Controls */}
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleMode}
                    className="gap-2"
                  >
                    <RotateCcw className="size-3.5" />
                    {cardMode === 'en_to_vi' ? 'EN → VI' : 'VI → EN'}
                  </Button>

                  <div className="flex items-center gap-2">
                    {currentCard.category && (
                      <Badge variant="outline" className="text-xs">
                        {currentCard.category}
                      </Badge>
                    )}
                    {currentCard.difficulty_level && (
                      <Badge variant="secondary" className="text-xs">
                        {'⭐'.repeat(currentCard.difficulty_level)}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Flashcard */}
                <div
                  className="perspective-1000"
                  onClick={isFront ? handleFlip : undefined}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleFlip(); }}
                >
                  <Card
                    className={cn(
                      'relative min-h-[320px] md:min-h-[380px] transition-all duration-300 cursor-pointer overflow-hidden',
                      isFront ? 'hover:shadow-lg hover:shadow-primary/10' : '',
                      isFlipping ? 'scale-95 opacity-50' : 'scale-100 opacity-100',
                      isFront
                        ? 'bg-gradient-to-br from-primary/5 via-card to-primary/10 border-primary/20'
                        : 'bg-gradient-to-br from-emerald-500/5 via-card to-emerald-500/10 border-emerald-500/20',
                    )}
                  >
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 size-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 size-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                    <CardContent className="relative flex flex-col items-center justify-center min-h-[320px] md:min-h-[380px] p-8">
                      {/* Front of card */}
                      {isFront && (
                        <div className="flex flex-col items-center gap-4 text-center animate-in fade-in duration-300">
                          <Badge variant="secondary" className="mb-2">
                            {frontLabel}
                          </Badge>
                          <h2 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                            {frontText}
                          </h2>
                          {frontPronunciation && (
                            <p className="text-lg text-muted-foreground flex items-center gap-2">
                              <Volume2 className="size-4" />
                              /{frontPronunciation}/
                            </p>
                          )}
                          {currentCard.part_of_speech && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {currentCard.part_of_speech}
                            </Badge>
                          )}
                          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                            <Eye className="size-4" />
                            Tap to reveal answer
                          </div>
                        </div>
                      )}

                      {/* Back of card */}
                      {!isFront && (
                        <div className="flex flex-col items-center gap-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                          <Badge variant="secondary" className="mb-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            {backLabel}
                          </Badge>
                          <h2 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                            {backText}
                          </h2>
                          {backPronunciation && (
                            <p className="text-lg text-muted-foreground flex items-center gap-2">
                              <Volume2 className="size-4" />
                              /{backPronunciation}/
                            </p>
                          )}

                          {/* Example toggle */}
                          {currentCard.example_english && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); setShowExample(!showExample); }}
                              className="gap-1 text-xs"
                            >
                              {showExample ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                              {showExample ? 'Hide' : 'Show'} example
                            </Button>
                          )}

                          {/* Example sentence */}
                          {showExample && currentCard.example_english && (
                            <div className="mt-2 rounded-lg bg-muted/50 p-4 max-w-md animate-in fade-in duration-200">
                              <p className="text-sm text-foreground">
                                🇬🇧 {currentCard.example_english}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                🇻🇳 {currentCard.example_vietnamese}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Rating Buttons */}
                {!isFront && (
                  <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <p className="text-center text-sm text-muted-foreground mb-3">
                      How well did you know this? (Press 1-4)
                    </p>
                    <div className="grid grid-cols-4 gap-3">
                      {RATINGS.map((r) => {
                        const Icon = r.icon;
                        return (
                          <Tooltip key={r.value}>
                            <TooltipTrigger asChild>
                              <Button
                                onClick={() => handleRate(r.value)}
                                disabled={submitting}
                                className={cn(
                                  'flex flex-col items-center gap-1 h-auto py-3 text-white font-semibold transition-all',
                                  r.color,
                                  submitting && 'opacity-50'
                                )}
                              >
                                <Icon className="size-5" />
                                <span className="text-sm">{r.label}</span>
                                <span className="text-[10px] opacity-80">{r.sublabel}</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Rate {r.value}: {r.label} - next review in ~{r.sublabel.replace('<', '')}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Keyboard hint */}
                {isFront && (
                  <p className="mt-4 text-center text-xs text-muted-foreground">
                    Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Space</kbd> or click to flip
                  </p>
                )}
              </div>
            )}

            {/* ─── Session Complete View ──────────────────── */}
            {!loading && pageView === 'complete' && sessionStats.total > 0 && (
              <div className="mt-12 flex flex-col items-center gap-6 animate-in fade-in duration-500">
                <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="size-10 text-primary" />
                </div>

                <div className="text-center">
                  <h2 className="text-3xl font-bold text-foreground">Session Complete! 🎉</h2>
                  <p className="text-muted-foreground mt-2">Great work on your vocabulary practice!</p>
                </div>

                {/* Session Summary */}
                <div className="grid grid-cols-3 gap-4 w-full max-w-md">
                  <Card className="text-center">
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold text-foreground">{sessionStats.total}</p>
                      <p className="text-xs text-muted-foreground">Cards Reviewed</p>
                    </CardContent>
                  </Card>
                  <Card className="text-center">
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold text-emerald-600">{sessionStats.correct}</p>
                      <p className="text-xs text-muted-foreground">Correct</p>
                    </CardContent>
                  </Card>
                  <Card className="text-center">
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold text-red-500">{sessionStats.wrong}</p>
                      <p className="text-xs text-muted-foreground">Needs Review</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Accuracy */}
                {sessionStats.total > 0 && (
                  <div className="w-full max-w-md">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Accuracy</span>
                      <span className="font-semibold">
                        {Math.round((sessionStats.correct / sessionStats.total) * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={(sessionStats.correct / sessionStats.total) * 100}
                      className="h-3"
                    />
                  </div>
                )}

                {/* Overall Stats */}
                {stats && (
                  <Card className="w-full max-w-md">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <BarChart3 className="size-4 text-primary" />
                        Overall Progress
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Words Mastered</span>
                          <span className="font-semibold text-primary">{stats.words_mastered}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Words Learning</span>
                          <span className="font-semibold text-emerald-600">{stats.words_learning}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Words Remaining</span>
                          <span className="font-semibold text-amber-600">{stats.words_new}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Streak</span>
                          <span className="font-semibold text-orange-500 flex items-center gap-1">
                            <Flame className="size-3" /> {stats.streak_days} days
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Reviews</span>
                          <span className="font-semibold">{stats.total_reviews}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-3">
                  <Button onClick={handleRestart} size="lg" className="gap-2">
                    <RotateCcw className="size-4" />
                    Study Again
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/')} size="lg" className="gap-2">
                    <ChevronRight className="size-4" />
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            )}

            {/* ─── No Cards State ────────────────────────── */}
            {!loading && pageView === 'complete' && sessionStats.total === 0 && cards.length === 0 && (
              <div className="mt-12 flex flex-col items-center gap-4">
                <BookOpen className="size-16 text-muted-foreground" />
                <h2 className="text-2xl font-bold">No Cards Available</h2>
                <p className="text-muted-foreground text-center max-w-md">
                  There are no vocabulary cards available right now. Check back later or ask your teacher to add more words!
                </p>
                <Button onClick={() => router.push('/')} className="gap-2">
                  Back to Dashboard
                </Button>
              </div>
            )}

            <div className="h-8" />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
