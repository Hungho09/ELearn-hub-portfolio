'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  RotateCcw,
  Brain,
  BookOpen,
  Flame,
  Star,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  grader: 'comet' | 'levenshtein' | 'exact';
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
type PageView = 'landing' | 'session' | 'complete';

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

// ─── Gamification & Neon Effects ─────────────────────────────

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  angle: number;
  speed: number;
}

function getParticleColor(matchType: string | undefined) {
  if (!matchType) return '#6C5CE7';
  if (matchType === 'exact' || matchType === 'semantic') return '#10B981'; // Emerald
  if (matchType === 'close') return '#F59E0B'; // Amber
  if (matchType === 'partial') return '#F97316'; // Orange
  return '#EF4444'; // Red
}

function NeonParticles({ active, color }: { active: boolean; color: string }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (active) {
      const newParticles = Array.from({ length: 32 }).map((_, i) => {
        const angle = Math.random() * 2 * Math.PI;
        const speed = Math.random() * 110 + 60;
        return {
          id: Math.random() + i,
          x: 0,
          y: 0,
          color,
          size: Math.random() * 6 + 4,
          angle,
          speed,
        };
      });
      setParticles(newParticles);
      
      const timer = setTimeout(() => {
        setParticles([]);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [active, color]);

  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: '50%', y: '50%', scale: 1, opacity: 1 }}
          animate={{
            x: `calc(50% + ${Math.cos(p.angle) * p.speed}px)`,
            y: `calc(50% + ${Math.sin(p.angle) * p.speed}px)`,
            scale: 0.1,
            opacity: 0,
          }}
          transition={{ duration: 0.8, ease: [0.1, 0.8, 0.3, 1] }}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 8px ${p.color}, 0 0 16px ${p.color}`,
            left: -p.size / 2,
            top: -p.size / 2,
          }}
        />
      ))}
    </div>
  );
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
  const [pageView, setPageView] = useState<PageView>('landing');
  const [rawSessionData, setRawSessionData] = useState<FlashcardSessionData | null>(null);
  const [studyMode, setStudyMode] = useState<'learn' | 'review'>('learn');

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

  // Animation & Particles
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [triggerParticles, setTriggerParticles] = useState(false);

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

      setRawSessionData(data);
      setCurrentIndex(0);
      setCardPhase('prompt');
      setUserInput('');
      setShowHint(false);
      setCheckResult(null);
      
      const hasCards = data.due_cards.length > 0 || data.new_cards.length > 0;
      setPageView(hasCards ? 'landing' : 'complete');
      
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
        setPrevLevel(statsData.currentLevel ?? 1);
        setNewLevel(statsData.currentLevel ?? 1);
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

  // Tự động kích hoạt chế độ Ôn tập khi có tham số ?mode=review từ chuông thông báo
  useEffect(() => {
    if (!rawSessionData) return;
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    if (modeParam === 'review' && rawSessionData.due_cards.length > 0) {
      setCards(rawSessionData.due_cards);
      setStudyMode('review');
      setPageView('session');
      // Xóa query param để tránh bị kích hoạt lại ngoài ý muốn
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [rawSessionData]);

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
      // Trigger dynamic neon particles spark blow
      setTriggerParticles(true);
      setTimeout(() => setTriggerParticles(false), 150);
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
            if (update) {
              update({
                xpPoints: freshStats.xpPoints ?? 0,
                currentLevel: freshStats.currentLevel ?? 1,
              });
            }
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
            if (update) {
              update({
                xpPoints: freshStats.xpPoints ?? 0,
                currentLevel: freshStats.currentLevel ?? 1,
              });
            }
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
      <div className="flex h-screen overflow-hidden bg-transparent">
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
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    if (pageView === 'session') {
                      setPageView('landing');
                    } else {
                      router.push('/');
                    }
                  }}
                >
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

            {/* ─── Landing Hub View ─────────────────────────── */}
            {!loading && pageView === 'landing' && rawSessionData && (
              <div className="mt-8 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Stats overview banner */}
                {stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card variant="interactive-glass" className="p-4 border-primary/20 flex flex-col justify-center items-center text-center">
                      <Star className="size-5 text-cyan-400 mb-1" />
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Cấp độ học</span>
                      <span className="text-lg font-black text-foreground mt-1">Lv.{stats.currentLevel ?? 1}</span>
                    </Card>
                    <Card variant="interactive-glass" className="p-4 border-emerald-500/20 flex flex-col justify-center items-center text-center">
                      <Flame className="size-5 text-orange-500 mb-1" />
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Chuỗi streak</span>
                      <span className="text-lg font-black text-foreground mt-1">{stats.streak_days} ngày</span>
                    </Card>
                    <Card variant="interactive-glass" className="p-4 border-indigo-500/20 flex flex-col justify-center items-center text-center">
                      <BookOpen className="size-5 text-primary mb-1" />
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Đã học hôm nay</span>
                      <span className="text-lg font-black text-foreground mt-1">{stats.reviews_today} từ</span>
                    </Card>
                    <Card variant="interactive-glass" className="p-4 border-amber-500/20 flex flex-col justify-center items-center text-center">
                      <GraduationCap className="size-5 text-amber-500 mb-1" />
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Bậc thầy (Mastered)</span>
                      <span className="text-lg font-black text-foreground mt-1">{stats.words_mastered} từ</span>
                    </Card>
                  </div>
                )}

                {/* Main Choice Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  
                  {/* Learn Card */}
                  <div className="rounded-2xl border border-border/40 bg-card/45 p-6 backdrop-blur-md flex flex-col justify-between gap-6 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[50px] group-hover:scale-110 transition-transform duration-500" />
                    <div className="flex flex-col gap-2">
                      <div className="size-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary dark:text-[#A29BFE] mb-2 shadow-sm">
                        <Brain className="size-5" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground">Học Từ Vựng Mới</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Khám phá và tiếp thu các từ vựng mới tinh được chọn lọc phù hợp với trình độ hiện tại của bạn.
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/20 pt-4 mt-2">
                      <span className="text-xs font-bold text-muted-foreground">
                        Sẵn sàng học: <span className="text-primary font-black text-sm">{rawSessionData.total_new} từ</span>
                      </span>
                      <Button
                        onClick={() => {
                          if (rawSessionData.new_cards.length > 0) {
                            setCards(rawSessionData.new_cards);
                            setStudyMode('learn');
                            setPageView('session');
                          }
                        }}
                        disabled={rawSessionData.new_cards.length === 0}
                        className="text-xs font-bold bg-primary hover:bg-primary/95 text-white shadow-md shadow-primary/20 py-2 rounded-xl"
                      >
                        Bắt đầu học
                      </Button>
                    </div>
                  </div>

                  {/* Review Card */}
                  <div className={cn(
                    "rounded-2xl border bg-card/45 p-6 backdrop-blur-md flex flex-col justify-between gap-6 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden group",
                    rawSessionData.total_due > 0 ? "border-amber-500/30" : "border-border/40"
                  )}>
                    <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-amber-500/10 blur-[50px] group-hover:scale-110 transition-transform duration-500" />
                    <div className="flex flex-col gap-2">
                      <div className={cn(
                        "size-10 rounded-xl flex items-center justify-center mb-2 shadow-sm border",
                        rawSessionData.total_due > 0 
                          ? "bg-amber-500/15 border-amber-500/20 text-amber-500" 
                          : "bg-muted/15 border-border/20 text-muted-foreground"
                      )}>
                        <RotateCcw className="size-5" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <span>Ôn Tập Từ Vựng</span>
                        {rawSessionData.total_due > 0 && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
                            Cần ôn
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Ôn tập định kỳ các từ cũ theo thuật toán lặp lại ngắt quãng (SRS) để ghi nhớ vĩnh viễn.
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/20 pt-4 mt-2">
                      <span className="text-xs font-bold text-muted-foreground">
                        Cần ôn hôm nay: <span className={cn("font-black text-sm", rawSessionData.total_due > 0 ? "text-amber-500" : "text-muted-foreground")}>{rawSessionData.total_due} từ</span>
                      </span>
                      <Button
                        onClick={() => {
                          if (rawSessionData.due_cards.length > 0) {
                            setCards(rawSessionData.due_cards);
                            setStudyMode('review');
                            setPageView('session');
                          }
                        }}
                        disabled={rawSessionData.due_cards.length === 0}
                        className={cn(
                          "text-xs font-bold py-2 rounded-xl border transition-all",
                          rawSessionData.total_due > 0
                            ? "bg-amber-500 hover:bg-amber-500/90 text-white shadow-md shadow-amber-500/20 border-transparent"
                            : "bg-transparent border-border/40 text-muted-foreground"
                        )}
                      >
                        {rawSessionData.total_due > 0 ? "Bắt đầu ôn tập" : "Đã hoàn thành!"}
                      </Button>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* ─── Session View ─────────────────────────── */}
            {!loading && pageView === 'session' && currentCard && (
              <div className="mt-6 flex flex-col items-center justify-center min-h-[460px] relative w-full" style={{ perspective: 1200 }}>
                <NeonParticles active={triggerParticles} color={getParticleColor(checkResult?.match_type)} />
                
                <motion.div
                  className="w-full h-full relative"
                  style={{ transformStyle: 'preserve-3d' }}
                  animate={{ rotateY: cardPhase === 'result' ? 180 : 0 }}
                  transition={{ duration: 0.65, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  {/* Front Side: Question Card */}
                  <div
                    className="w-full"
                    style={{
                      backfaceVisibility: 'hidden',
                      position: cardPhase === 'result' ? 'absolute' : 'relative',
                      zIndex: cardPhase === 'prompt' ? 10 : 0,
                      pointerEvents: cardPhase === 'prompt' ? 'auto' : 'none',
                    }}
                  >
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
                  </div>

                  {/* Back Side: Result Card */}
                  <div
                    className="w-full animate-in duration-300"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      position: cardPhase === 'prompt' ? 'absolute' : 'relative',
                      zIndex: cardPhase === 'result' ? 10 : 0,
                      pointerEvents: cardPhase === 'result' ? 'auto' : 'none',
                    }}
                  >
                    {checkResult && (
                      <StudyResult
                        result={checkResult}
                        submitting={submitting}
                        onContinue={handleContinue}
                      />
                    )}
                  </div>
                </motion.div>
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
                  onBack={() => setPageView('landing')}
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
