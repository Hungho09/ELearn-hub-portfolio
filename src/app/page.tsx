'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Menu,
  Download,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/home/Sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { LanguageCard } from '@/components/learn/LanguageCard';
import { LearningStats } from '@/components/learn/LearningStats';
import { cn } from '@/lib/utils';

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

interface CategoryProgress {
  category: string;
  total_words: number;
  learned_words: number;
  mastered_words: number;
  average_ease_factor: number;
}

/** Languages available (or coming soon) */
const LANGUAGES = [
  {
    id: 'english',
    name: 'English',
    nativeName: 'Tiếng Anh',
    flag: '🇬🇧',
    description: 'Học từ vựng tiếng Anh với phương pháp Active Recall — nhập đáp án và hệ thống tự đánh giá.',
    available: true,
  },
  {
    id: 'japanese',
    name: 'Japanese',
    nativeName: 'Tiếng Nhật',
    flag: '🇯🇵',
    description: 'Học Kanji, Hiragana, Katakana và từ vựng tiếng Nhật.',
    available: false,
  },
  {
    id: 'korean',
    name: 'Korean',
    nativeName: 'Tiếng Hàn',
    flag: '🇰🇷',
    description: 'Học Hangul và từ vựng tiếng Hàn cho người mới bắt đầu.',
    available: false,
  },
  {
    id: 'german',
    name: 'German',
    nativeName: 'Tiếng Đức',
    flag: '🇩🇪',
    description: 'Học từ vựng tiếng Đức với hệ thống ôn tập thông minh.',
    available: false,
  },
  {
    id: 'french',
    name: 'French',
    nativeName: 'Tiếng Pháp',
    flag: '🇫🇷',
    description: 'Học từ vựng tiếng Pháp từ cơ bản đến nâng cao.',
    available: false,
  },
  {
    id: 'chinese',
    name: 'Chinese',
    nativeName: 'Tiếng Trung',
    flag: '🇨🇳',
    description: 'Học Hán tự và từ vựng tiếng Trung thông dụng.',
    available: false,
  },
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [totalVocab, setTotalVocab] = useState(0);
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<string | null>(null);

  const userId = session?.user?.id || session?.user?.email || 'guest';
  const userName = session?.user?.name || 'Học viên';

  // Load user stats
  useEffect(() => {
    if (status === 'loading') return;

    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/flashcards/stats?user_id=${encodeURIComponent(userId)}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // Stats are optional
      }
    };

    const fetchTotalVocab = async () => {
      try {
        const res = await fetch(`/api/flashcards/session?user_id=${encodeURIComponent(userId)}&limit=1`);
        if (res.ok) {
          const data = await res.json();
          setTotalVocab(data.total_new + data.total_learned);
        }
      } catch {
        // Optional
      }
    };

    fetchStats();
    fetchTotalVocab();
  }, [userId, status]);

  const handleLanguageStart = useCallback((langId: string) => {
    if (langId === 'english') {
      router.push('/study/english');
    }
  }, [router]);

  const handleEnrich = useCallback(async () => {
    setEnriching(true);
    setEnrichResult(null);
    try {
      const res = await fetch('/api/vocabulary/auto-enrich?count=200', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setEnrichResult(`Lỗi: ${data.error || 'Không thể thêm từ vựng'}`);
        return;
      }
      const data = await res.json();
      setTotalVocab(data.total_in_db);
      setEnrichResult(
        `Đã thêm ${data.added} từ mới! Bỏ qua ${data.skipped}, lỗi ${data.errors}. Tổng: ${data.total_in_db} từ`
      );
    } catch {
      setEnrichResult('Lỗi kết nối đến server. Hãy thử lại.');
    } finally {
      setEnriching(false);
    }
  }, []);

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Left Sidebar */}
        <div className="hidden md:block shrink-0">
          <Sidebar collapsed={false} />
        </div>

        {/* Mobile sidebar */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-[260px]">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <Sidebar collapsed={false} onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="mx-auto max-w-5xl p-5 md:p-6 lg:p-8">
            {/* Top Bar - Mobile */}
            <div className="flex items-center justify-between md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="size-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
                  <GraduationCap className="size-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-foreground">LearnHub</span>
              </div>
              <div className="size-8" /> {/* Spacer */}
            </div>

            {/* Welcome Section */}
            <div className="mt-4 md:mt-0">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Xin chào, {userName}! 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                Chọn ngôn ngữ để bắt đầu học tập ngay hôm nay
              </p>
            </div>

            {/* Stats */}
            {stats && (
              <div className="mt-6">
                <LearningStats
                  totalReviews={stats.total_reviews}
                  wordsMastered={stats.words_mastered}
                  wordsLearning={stats.words_learning}
                  streakDays={stats.streak_days}
                  reviewsToday={stats.reviews_today}
                />
              </div>
            )}

            {/* Language Selection */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Chọn ngôn ngữ học
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {LANGUAGES.map((lang) => (
                  <LanguageCard
                    key={lang.id}
                    name={lang.name}
                    nativeName={lang.nativeName}
                    flag={lang.flag}
                    description={lang.description}
                    available={lang.available}
                    wordsLearned={lang.available && stats ? stats.total_unique_words : 0}
                    totalWords={lang.available ? totalVocab : 0}
                    streakDays={lang.available && stats ? stats.streak_days : 0}
                    onStart={() => handleLanguageStart(lang.id)}
                  />
                ))}
              </div>
            </div>

            {/* Vocabulary Enrichment */}
            <div className="mt-8">
              <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Download className="size-4 text-primary" />
                        Thêm từ vựng từ API
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Lấy thêm từ vựng từ Free Dictionary API + MyMemory Translation. Hiện có <span className="font-semibold text-primary">{totalVocab}</span> từ.
                      </p>
                    </div>
                    <Button
                      onClick={handleEnrich}
                      disabled={enriching}
                      variant="outline"
                      className="gap-2"
                    >
                      {enriching ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Đang thêm...
                        </>
                      ) : (
                        <>
                          <Download className="size-4" />
                          Thêm 200 từ
                        </>
                      )}
                    </Button>
                  </div>
                  {enrichResult && (
                    <p className={cn(
                      'mt-3 text-sm rounded-lg p-2',
                      enrichResult.startsWith('Lỗi')
                        ? 'text-destructive bg-destructive/10'
                        : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/20'
                    )}>
                      {enrichResult}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Tips Section */}
            <div className="mt-10 mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Mẹo học tập
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-5">
                  <p className="text-2xl mb-2">🎯</p>
                  <h3 className="font-semibold text-foreground text-sm">Active Recall</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Nhập đáp án thay vì tự đánh giá. Hệ thống tự chấm điểm giúp bạn học trung thực hơn.
                  </p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border border-emerald-500/20 p-5">
                  <p className="text-2xl mb-2">🧠</p>
                  <h3 className="font-semibold text-foreground text-sm">Spaced Repetition</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Thuật toán TCGL thông minh lên lịch ôn tập tối ưu dựa trên đường quên của bạn.
                  </p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-orange-500/5 to-orange-500/10 border border-orange-500/20 p-5">
                  <p className="text-2xl mb-2">🔥</p>
                  <h3 className="font-semibold text-foreground text-sm">Streak</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Duy trì chuỗi ngày học để xây dựng thói quen. Mỗi ngày ôn tập đều đặn là bước tiến lớn!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
