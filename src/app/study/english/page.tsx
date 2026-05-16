'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RotateCcw,
  Brain,
  BookOpen,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ─── Components ───────────────────────────────────────────────────

import { Sidebar } from '@/components/home/Sidebar';
import { StudyCard } from '@/components/study/StudyCard';
import { StudyResult } from '@/components/study/StudyResult';
import { SessionComplete } from '@/components/study/SessionComplete';
import { LevelUpModal } from '@/components/study/LevelUpModal';
import { BadgeUnlock } from '@/components/study/BadgeUnlock';

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
  direction: 'en_to_vi' | 'vi_to_en';
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
  xpPoints?: number;
  currentLevel?: number;
  nextLevelXp?: number;
}

interface CheckAnswerResult {
  vocabulary_id: number;
  correct_answer: string;
  user_answer: string;
  rating: number;
  accuracy: number;
  is_correct: boolean;
  match_type: 'exact' | 'close' | 'partial' | 'incorrect' | 'semantic';
  similarity: number;
  pronunciation: string | null;
  example_english: string | null;
  example_vietnamese: string | null;
  grader: 'labse' | 'levenshtein' | 'exact';
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
  xpEarned?: number;
  unlockedBadges?: string[];
}

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

// ─── Main Component ──────────────────────────────────────────────

export default function StudyEnglishPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Card state
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardPhase, setCardPhase] = useState<CardPhase>('prompt');
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

  // ─── Gamification state ────────────────────────────────────
  const [earnedXp, setEarnedXp] = useState(0);
  const [prevLevel, setPrevLevel] = useState(session?.user?.currentLevel ?? 1);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showBadgeUnlock, setShowBadgeUnlock] = useState(false);
  const [newLevel, setNewLevel] = useState(1);

  const userId = session?.user?.id || session?.user?.email || 'guest';
  // Track whether user has finished a session — blocks auto-reload
  const sessionCompleteRef = useRef(false);

  // ─── Load session data ────────────────────────────────────
  const loadSession = useCallback(async () => {
    if (status === 'loading') return;
    // Don't auto-reload if user just finished a session
    if (sessionCompleteRef.current) return;
    try {
      setLoading(true);
      setError(null);
      const uid = userId || 'guest';
      const data = await getSession(uid, 20);

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

      // Reset gamification state
      setEarnedXp(0);
      setUnlockedBadges([]);
      setShowLevelUp(false);
      setShowBadgeUnlock(false);
      setPrevLevel(session?.user?.currentLevel ?? 1);
      setNewLevel(session?.user?.currentLevel ?? 1);

      try {
        const statsData = await getStats(uid);
        setStats(statsData);
      } catch {
        // Stats are optional
      }
    } catch (err) {
      setError('Không thể tải flashcard. Vui lòng thử lại.');
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
      const result = await checkAnswer(currentCard.id, userInput.trim(), currentCard.direction);
      setCheckResult(result);
      setCardPhase('result');
    } catch (err) {
      console.error('Check answer error:', err);
      setError('Không thể kiểm tra đáp án. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }, [currentCard, submitting, userInput]);

  const handleContinue = useCallback(async () => {
    if (!currentCard || !checkResult || submitting) return;

    const responseTime = Date.now() - cardStartTime;
    setSubmitting(true);

    try {
      const uid = userId || 'guest';
      const review = await submitReview(
        uid,
        currentCard.id,
        checkResult.rating,
        currentCard.direction,
        responseTime,
        userInput.trim(),
        true
      );

      // Accumulate gamification
      if (review.xpEarned) {
        setEarnedXp(prev => prev + review.xpEarned);
      }
      if (review.unlockedBadges && review.unlockedBadges.length > 0) {
        setUnlockedBadges(prev => [...prev, ...review.unlockedBadges]);
        setShowBadgeUnlock(true);
      }

      setSessionStats(prev => ({
        correct: prev.correct + (checkResult.is_correct && (checkResult.match_type === 'exact' || checkResult.match_type === 'semantic') ? 1 : 0),
        close: prev.close + (checkResult.match_type === 'close' ? 1 : 0),
        wrong: prev.wrong + (!checkResult.is_correct ? 1 : 0),
        total: prev.total + 1,
      }));

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
          // Finished session — fetch fresh stats, show complete view
          sessionCompleteRef.current = true;
          setPageView('complete');
          getStats(uid).then((freshStats) => {
            setStats(freshStats);
            if (freshStats.currentLevel && freshStats.currentLevel > prevLevel) {
              setNewLevel(freshStats.currentLevel);
              setShowLevelUp(true);
            }
          }).catch(() => {});
        }
        setIsTransitioning(false);
      }, 300);
    } catch (err) {
      console.error('Review submit error:', err);
      setError('Không thể lưu kết quả. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }, [currentCard, checkResult, submitting, cardStartTime, userId, currentIndex, cards.length, userInput, prevLevel]);

  const handleSkip = useCallback(async () => {
    if (!currentCard || submitting) return;

    const responseTime = Date.now() - cardStartTime;
    setSubmitting(true);

    try {
      const uid = userId || 'guest';
      const review = await submitReview(uid, currentCard.id, 1, currentCard.direction, responseTime, '', true);

      // Accumulate gamification
      if (review.xpEarned) {
        setEarnedXp(prev => prev + review.xpEarned);
      }
      if (review.unlockedBadges && review.unlockedBadges.length > 0) {
        setUnlockedBadges(prev => [...prev, ...review.unlockedBadges]);
        setShowBadgeUnlock(true);
      }

      setSessionStats(prev => ({
        ...prev,
        wrong: prev.wrong + 1,
        total: prev.total + 1,
      }));

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
          sessionCompleteRef.current = true;
          setPageView('complete');
          getStats(uid).then((freshStats) => {
            setStats(freshStats);
            if (freshStats.currentLevel && freshStats.currentLevel > prevLevel) {
              setNewLevel(freshStats.currentLevel);
              setShowLevelUp(true);
            }
          }).catch(() => {});
        }
        setIsTransitioning(false);
      }, 300);
    } catch (err) {
      console.error('Skip submit error:', err);
      setError('Không thể bỏ qua. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }, [currentCard, submitting, cardStartTime, userId, currentIndex, cards.length, prevLevel]);

  const handleRestart = useCallback(() => {
    sessionCompleteRef.current = false;
    // Sync NextAuth session with latest XP/level before reloading
    if (update && stats) {
      update({
        xpPoints: stats.xpPoints ?? 0,
        currentLevel: stats.currentLevel ?? 1,
      });
    }
    loadSession();
  }, [loadSession, update, stats]);


  // ─── Keyboard shortcuts ───────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
          if (cardPhase === 'prompt') {
            handleSkip();
          }
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
  }, [cardPhase, userInput, handleSubmitAnswer, handleContinue, handleSkip]);

  // ─── Computed values ──────────────────────────────────────
  const progressPercent = cards.length > 0 ? ((currentIndex) / cards.length) * 100 : 0;

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
            {/* Header */}
            <div className="mt-4 md:mt-0 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
                  <ArrowLeft className="size-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Brain className="size-6 text-primary" />
                    Tiếng Anh
                  </h1>
                  <p className="text-sm text-muted-foreground">Nhập đáp án để học từ vựng</p>
                </div>
              </div>
              {stats && (
                <div className="hidden sm:flex items-center gap-3">
                  <Badge variant="secondary" className="gap-1">
                    <Flame className="size-3 text-orange-500" />
                    {stats.streak_days} ngày
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <BookOpen className="size-3 text-primary" />
                    {stats.reviews_today} hôm nay
                  </Badge>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {pageView === 'session' && cards.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <span>Thẻ {currentIndex + 1} / {cards.length}</span>
                  <span>{Math.round(progressPercent)}% hoàn thành</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
                {error}
                <Button variant="link" size="sm" onClick={() => setError(null)} className="ml-2">
                  Đóng
                </Button>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="mt-12 flex flex-col items-center justify-center gap-4">
                <div className="size-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground">Đang tải flashcard...</p>
              </div>
            )}

            {/* ─── Session View ─────────────────────────── */}
            {!loading && pageView === 'session' && currentCard && (
              <div className={cn(
                'mt-6 transition-all duration-300',
                isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
              )}>
                {cardPhase === 'prompt' && (
                  <StudyCard
                    card={currentCard}
                    userInput={userInput}
                    showHint={showHint}
                    submitting={submitting}
                    onInputChange={setUserInput}
                    onSubmit={handleSubmitAnswer}
                    onSkip={handleSkip}
                    onShowHint={() => setShowHint(true)}
                    inputRef={inputRef}
                  />
                )}

                {cardPhase === 'result' && checkResult && (
                  <StudyResult
                    result={checkResult}
                    submitting={submitting}
                    onContinue={handleContinue}
                  />
                )}
              </div>
            )}

            {/* ─── Session Complete View ──────────────────── */}
            {!loading && pageView === 'complete' && sessionStats.total > 0 && (
              <div className="mt-12">
                <SessionComplete
                  sessionStats={sessionStats}
                  userStats={stats}
                  earnedXp={earnedXp}
                  onRestart={handleRestart}
                  onBack={() => router.push('/')}
                />
              </div>
            )}

            {/* ─── No Cards State ────────────────────────── */}
            {!loading && pageView === 'complete' && sessionStats.total === 0 && cards.length === 0 && (
              <div className="mt-12 flex flex-col items-center gap-4">
                <BookOpen className="size-16 text-muted-foreground" />
                <h2 className="text-2xl font-bold">Chưa có thẻ học</h2>
                <p className="text-muted-foreground text-center max-w-md">
                  Hiện chưa có từ vựng nào để học. Vui lòng quay lại sau!
                </p>
                <Button onClick={() => router.push('/')} className="gap-2">
                  <ArrowLeft className="size-4" />
                  Về trang chủ
                </Button>
              </div>
            )}

            <div className="h-8" />
          </div>
        </main>
      </div>

      {/* Gamification overlays */}
      {showLevelUp && (
        <LevelUpModal
          prevLevel={prevLevel}
          newLevel={newLevel}
          onClose={() => setShowLevelUp(false)}
        />
      )}
      {showBadgeUnlock && unlockedBadges.length > 0 && (
        <BadgeUnlock
          badges={unlockedBadges}
          onClose={() => setShowBadgeUnlock(false)}
        />
      )}
    </TooltipProvider>
  );
}
