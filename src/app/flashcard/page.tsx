'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RotateCcw,
  Brain,
  BookOpen,
  Flame,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Volume2,
  BarChart3,
  Sparkles,
  Lightbulb,
  SkipForward,
  ArrowRight,
  Languages,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
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
  accepted_answers?: string[];
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

interface CheckAnswerResult {
  vocabulary_id: number;
  correct_answer: string;
  user_answer: string;
  rating: number;
  accuracy: number;
  is_correct: boolean;
  match_type: 'exact' | 'close' | 'partial' | 'incorrect';
  similarity: number;
  pronunciation: string | null;
  example_english: string | null;
  example_vietnamese: string | null;
}

interface ReviewResult {
  vocabulary_id: number;
  rating: number;
  new_interval_days: number;
  new_ease_factor: number;
  new_repetitions: number;
  next_review_at: string | null;
  auto_rating?: boolean;
  accuracy?: number;
  match_type?: string;
}

type CardMode = 'en_to_vi' | 'vi_to_en';
type CardPhase = 'prompt' | 'result';
type PageView = 'session' | 'complete';

// ─── API Helpers ──────────────────────────────────────────────────

async function getSession(userId: string, limit = 20): Promise<FlashcardSessionData> {
  const res = await fetch(`/api/flashcards/session?user_id=${encodeURIComponent(userId)}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch session');
  return res.json();
}

async function checkAnswer(vocabularyId: number, userAnswer: string, direction: string): Promise<CheckAnswerResult> {
  const res = await fetch('/api/flashcards/check-answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vocabulary_id: vocabularyId,
      user_answer: userAnswer,
      direction,
    }),
  });
  if (!res.ok) throw new Error('Failed to check answer');
  return res.json();
}

async function submitReview(
  userId: string,
  vocabId: number,
  rating: number,
  direction: string,
  responseTimeMs?: number,
  userAnswer?: string,
  autoRating?: boolean
): Promise<ReviewResult> {
  const res = await fetch(`/api/flashcards/review?user_id=${encodeURIComponent(userId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vocabulary_id: vocabId,
      rating,
      direction,
      response_time_ms: responseTimeMs,
      user_answer: userAnswer,
      auto_rating: autoRating,
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

// ─── Match type config ──────────────────────────────────────────

const MATCH_CONFIG = {
  exact: {
    icon: CheckCircle2,
    label: 'Correct!',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    cardBorder: 'border-l-4 border-l-emerald-500',
    badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  close: {
    icon: AlertTriangle,
    label: 'Almost!',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-300 dark:border-amber-700',
    cardBorder: 'border-l-4 border-l-amber-500',
    badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  partial: {
    icon: AlertTriangle,
    label: 'Partially correct',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-300 dark:border-orange-700',
    cardBorder: 'border-l-4 border-l-orange-500',
    badgeBg: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  },
  incorrect: {
    icon: XCircle,
    label: 'Incorrect',
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-300 dark:border-red-700',
    cardBorder: 'border-l-4 border-l-red-500',
    badgeBg: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
};

// ─── Main Component ──────────────────────────────────────────────

export default function FlashcardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Card state
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardPhase, setCardPhase] = useState<CardPhase>('prompt');
  const [cardMode, setCardMode] = useState<CardMode>('en_to_vi');
  const [pageView, setPageView] = useState<PageView>('session');

  // Input state
  const [userInput, setUserInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Result state
  const [checkResult, setCheckResult] = useState<CheckAnswerResult | null>(null);

  // Stats
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0, close: 0, total: 0 });

  // Loading states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timing
  const [cardStartTime, setCardStartTime] = useState<number>(Date.now());

  // Animation
  const [isTransitioning, setIsTransitioning] = useState(false);

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
      setCardPhase('prompt');
      setUserInput('');
      setShowHint(false);
      setCheckResult(null);
      setPageView(allCards.length > 0 ? 'session' : 'complete');
      setSessionStats({ correct: 0, wrong: 0, close: 0, total: 0 });
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

  // Focus input when card changes
  useEffect(() => {
    if (cardPhase === 'prompt' && !loading && inputRef.current) {
      // Small delay to allow DOM update
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [cardPhase, currentIndex, loading]);

  // ─── Card actions ─────────────────────────────────────────
  const currentCard = cards[currentIndex] as VocabCard | undefined;

  const handleSubmitAnswer = useCallback(async () => {
    if (!currentCard || submitting || !userInput.trim()) return;

    setSubmitting(true);
    try {
      const result = await checkAnswer(currentCard.id, userInput.trim(), cardMode);
      setCheckResult(result);
      setCardPhase('result');
    } catch (err) {
      console.error('Check answer error:', err);
      setError('Failed to check answer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [currentCard, submitting, userInput, cardMode]);

  const handleContinue = useCallback(async () => {
    if (!currentCard || !checkResult || submitting) return;

    const responseTime = Date.now() - cardStartTime;
    setSubmitting(true);

    try {
      const uid = userId || 'guest';
      await submitReview(
        uid,
        currentCard.id,
        checkResult.rating,
        cardMode,
        responseTime,
        userInput.trim(),
        true
      );

      // Update session stats
      setSessionStats(prev => ({
        correct: prev.correct + (checkResult.is_correct && checkResult.match_type === 'exact' ? 1 : 0),
        close: prev.close + (checkResult.match_type === 'close' ? 1 : 0),
        wrong: prev.wrong + (!checkResult.is_correct ? 1 : 0),
        total: prev.total + 1,
      }));

      // Animate transition
      setIsTransitioning(true);
      setTimeout(() => {
        // Move to next card
        if (currentIndex + 1 < cards.length) {
          setCurrentIndex(prev => prev + 1);
          setCardPhase('prompt');
          setUserInput('');
          setShowHint(false);
          setCheckResult(null);
          setCardStartTime(Date.now());
        } else {
          // Session complete
          setPageView('complete');
          // Refresh stats
          getStats(uid).then(setStats).catch(() => {});
        }
        setIsTransitioning(false);
      }, 300);
    } catch (err) {
      console.error('Review submit error:', err);
      setError('Failed to save review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [currentCard, checkResult, submitting, cardStartTime, userId, cardMode, currentIndex, cards.length, userInput]);

  const handleSkip = useCallback(async () => {
    if (!currentCard || submitting) return;

    const responseTime = Date.now() - cardStartTime;
    setSubmitting(true);

    try {
      const uid = userId || 'guest';
      // Skip = rating 1 (Again)
      await submitReview(uid, currentCard.id, 1, cardMode, responseTime, '', true);

      setSessionStats(prev => ({
        ...prev,
        wrong: prev.wrong + 1,
        total: prev.total + 1,
      }));

      // Animate transition
      setIsTransitioning(true);
      setTimeout(() => {
        if (currentIndex + 1 < cards.length) {
          setCurrentIndex(prev => prev + 1);
          setCardPhase('prompt');
          setUserInput('');
          setShowHint(false);
          setCheckResult(null);
          setCardStartTime(Date.now());
        } else {
          setPageView('complete');
          getStats(uid).then(setStats).catch(() => {});
        }
        setIsTransitioning(false);
      }, 300);
    } catch (err) {
      console.error('Skip submit error:', err);
      setError('Failed to skip card. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [currentCard, submitting, cardStartTime, userId, cardMode, currentIndex, cards.length]);

  const handleRestart = useCallback(() => {
    loadSession();
  }, [loadSession]);

  const toggleMode = useCallback(() => {
    setCardMode(prev => prev === 'en_to_vi' ? 'vi_to_en' : 'en_to_vi');
    setCardPhase('prompt');
    setUserInput('');
    setShowHint(false);
    setCheckResult(null);
  }, []);

  // ─── Keyboard shortcuts ───────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in input (except Enter)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Enter' && cardPhase === 'prompt' && userInput.trim()) {
          e.preventDefault();
          handleSubmitAnswer();
        } else if (e.key === 'Enter' && cardPhase === 'result') {
          e.preventDefault();
          handleContinue();
        }
        return;
      }

      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          if (cardPhase === 'prompt' && userInput.trim()) {
            handleSubmitAnswer();
          } else if (cardPhase === 'result') {
            handleContinue();
          }
          break;
        case 'Tab':
          e.preventDefault();
          toggleMode();
          break;
        case 'Escape':
          e.preventDefault();
          if (cardPhase === 'prompt') {
            handleSkip();
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cardPhase, userInput, handleSubmitAnswer, handleContinue, handleSkip, toggleMode]);

  // ─── Computed values ──────────────────────────────────────
  const progressPercent = cards.length > 0 ? ((currentIndex) / cards.length) * 100 : 0;
  const promptText = cardMode === 'en_to_vi' ? currentCard?.english : currentCard?.vietnamese;
  const promptLabel = cardMode === 'en_to_vi' ? 'English' : 'Tiếng Việt';
  const answerLabel = cardMode === 'en_to_vi' ? 'Tiếng Việt' : 'English';
  const promptPronunciation = cardMode === 'en_to_vi' ? null : currentCard?.pronunciation;

  // Hint: first letter of the correct answer
  const correctAnswer = cardMode === 'en_to_vi' ? currentCard?.vietnamese : currentCard?.english;
  const hintLetter = correctAnswer ? correctAnswer[0] + '...' : '';

  // Match config for current result
  const matchConfig = checkResult ? MATCH_CONFIG[checkResult.match_type] : null;

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
                  <p className="text-sm text-muted-foreground">Type your answer to learn vocabulary</p>
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
              <div className={cn(
                'mt-6 transition-all duration-300',
                isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
              )}>
                {/* Mode Toggle & Controls */}
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleMode}
                    className="gap-2"
                  >
                    <Languages className="size-3.5" />
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

                {/* Prompt Card */}
                <Card className={cn(
                  'relative overflow-hidden transition-all duration-300',
                  cardPhase === 'prompt'
                    ? 'bg-gradient-to-br from-primary/5 via-card to-primary/10 border-primary/20'
                    : matchConfig
                      ? `${matchConfig.bgColor} ${matchConfig.borderColor}`
                      : 'bg-card',
                )}>
                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 size-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 size-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                  <CardContent className="relative p-6 md:p-8">
                    {/* ─── Prompt Phase ──────────────────────── */}
                    {cardPhase === 'prompt' && (
                      <div className="flex flex-col items-center gap-6 animate-in fade-in duration-300">
                        {/* Word prompt */}
                        <div className="text-center">
                          <Badge variant="secondary" className="mb-3">
                            {promptLabel}
                          </Badge>
                          <h2 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                            {promptText}
                          </h2>
                          {promptPronunciation && (
                            <p className="text-lg text-muted-foreground flex items-center gap-2 justify-center mt-2">
                              <Volume2 className="size-4" />
                              /{promptPronunciation}/
                            </p>
                          )}
                          {currentCard.part_of_speech && (
                            <Badge variant="outline" className="text-xs capitalize mt-2">
                              {currentCard.part_of_speech}
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
                              onChange={(e) => setUserInput(e.target.value)}
                              className="h-14 text-lg text-center px-4 rounded-xl border-2 focus:border-primary transition-colors"
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
                                className="absolute right-2 top-1/2 -translate-y-1/2 size-8"
                                onClick={() => setUserInput('')}
                              >
                                ×
                              </Button>
                            )}
                          </div>

                          {/* Hint & Skip buttons */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {!showHint ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowHint(true)}
                                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                                >
                                  <Lightbulb className="size-3.5" />
                                  Show hint
                                </Button>
                              ) : (
                                <Badge variant="outline" className="text-xs gap-1 py-1">
                                  <Lightbulb className="size-3" />
                                  Starts with: <span className="font-semibold">{hintLetter}</span>
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleSkip}
                              disabled={submitting}
                              className="gap-1.5 text-xs text-muted-foreground hover:text-red-500"
                            >
                              <SkipForward className="size-3.5" />
                              Skip
                            </Button>
                          </div>

                          {/* Check button */}
                          <Button
                            onClick={handleSubmitAnswer}
                            disabled={!userInput.trim() || submitting}
                            className="w-full h-12 text-base font-semibold rounded-xl gap-2"
                            size="lg"
                          >
                            {submitting ? (
                              <div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                              <>
                                Check
                                <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[11px]">↵</kbd>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* ─── Result Phase ──────────────────────── */}
                    {cardPhase === 'result' && checkResult && matchConfig && (
                      <div className="flex flex-col items-center gap-5 animate-in fade-in slide-in-from-bottom-4 duration-400">
                        {/* Result icon & label */}
                        <div className={cn('flex items-center gap-2 text-xl font-bold', matchConfig.color)}>
                          {(() => {
                            const Icon = matchConfig.icon;
                            return <Icon className="size-6" />;
                          })()}
                          {matchConfig.label}
                        </div>

                        {/* Accuracy badge */}
                        <div className="flex items-center gap-3">
                          <Badge className={cn('text-sm px-3 py-1', matchConfig.badgeBg)}>
                            {Math.round(checkResult.accuracy)}% accuracy
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {checkResult.match_type === 'exact' && 'Perfect match'}
                            {checkResult.match_type === 'close' && 'Minor differences'}
                            {checkResult.match_type === 'partial' && 'Partially correct'}
                            {checkResult.match_type === 'incorrect' && 'Not correct'}
                          </Badge>
                        </div>

                        {/* Your answer vs correct answer */}
                        <div className="w-full max-w-md space-y-3">
                          {/* User's answer */}
                          <div className={cn(
                            'rounded-xl p-4 border',
                            checkResult.is_correct
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                              : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                          )}>
                            <p className="text-xs text-muted-foreground mb-1">Your answer</p>
                            <p className={cn(
                              'text-lg font-semibold',
                              checkResult.is_correct ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                            )}>
                              {checkResult.user_answer}
                            </p>
                          </div>

                          {/* Correct answer */}
                          <div className={cn(
                            'rounded-xl p-4 border',
                            'bg-primary/5 border-primary/20'
                          )}>
                            <p className="text-xs text-muted-foreground mb-1">Correct answer</p>
                            <p className="text-lg font-bold text-foreground">
                              {checkResult.correct_answer}
                            </p>
                            {checkResult.pronunciation && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Volume2 className="size-3" />
                                /{checkResult.pronunciation}/
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Example sentence */}
                        {checkResult.example_english && (
                          <div className="w-full max-w-md rounded-xl bg-muted/50 p-4 border border-muted">
                            <p className="text-sm text-foreground">
                              🇬🇧 {checkResult.example_english}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              🇻🇳 {checkResult.example_vietnamese}
                            </p>
                          </div>
                        )}

                        {/* Continue button */}
                        <Button
                          onClick={handleContinue}
                          disabled={submitting}
                          className="w-full max-w-md h-12 text-base font-semibold rounded-xl gap-2"
                          size="lg"
                        >
                          {submitting ? (
                            <div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <>
                              Continue
                              <ArrowRight className="size-4" />
                              <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[11px]">↵</kbd>
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Keyboard shortcuts hint */}
                {cardPhase === 'prompt' && (
                  <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <span>
                      <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Tab</kbd> Switch direction
                    </span>
                    <span>
                      <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> Skip card
                    </span>
                  </div>
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
                  <h2 className="text-3xl font-bold text-foreground">Session Complete!</h2>
                  <p className="text-muted-foreground mt-2">Great work on your vocabulary practice!</p>
                </div>

                {/* Session Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-lg">
                  <Card className="text-center">
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold text-foreground">{sessionStats.total}</p>
                      <p className="text-xs text-muted-foreground">Reviewed</p>
                    </CardContent>
                  </Card>
                  <Card className="text-center border-l-4 border-l-emerald-500">
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold text-emerald-600">{sessionStats.correct}</p>
                      <p className="text-xs text-muted-foreground">Correct</p>
                    </CardContent>
                  </Card>
                  <Card className="text-center border-l-4 border-l-amber-500">
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold text-amber-600">{sessionStats.close}</p>
                      <p className="text-xs text-muted-foreground">Close</p>
                    </CardContent>
                  </Card>
                  <Card className="text-center border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold text-red-500">{sessionStats.wrong}</p>
                      <p className="text-xs text-muted-foreground">Needs Review</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Accuracy */}
                {sessionStats.total > 0 && (
                  <div className="w-full max-w-lg">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Accuracy</span>
                      <span className="font-semibold">
                        {Math.round(((sessionStats.correct + sessionStats.close) / sessionStats.total) * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={((sessionStats.correct + sessionStats.close) / sessionStats.total) * 100}
                      className="h-3"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Includes exact matches and close answers
                    </p>
                  </div>
                )}

                {/* Overall Stats */}
                {stats && (
                  <Card className="w-full max-w-lg">
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
