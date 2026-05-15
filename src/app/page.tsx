'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Menu,
  Target,
  BrainCircuit,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/home/Sidebar';
import { LanguageCard } from '@/components/learn/LanguageCard';
import { Card, CardContent } from '@/components/ui/card';
import { LearningStats } from '@/components/learn/LearningStats';

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

            {/* Quick Tips Section */}
            <div className="mt-10 mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Mẹo học tập
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardContent className="p-5">
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <Target className="size-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">Active Recall</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Nhập đáp án thay vì tự đánh giá. Hệ thống tự chấm điểm giúp bạn học trung thực hơn.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10">
                  <CardContent className="p-5">
                    <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
                      <BrainCircuit className="size-4 text-emerald-500" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">Spaced Repetition</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Thuật toán TGCL thông minh lên lịch ôn tập tối ưu dựa trên đường quên của bạn.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-orange-500/10">
                  <CardContent className="p-5">
                    <div className="size-8 rounded-lg bg-orange-500/10 flex items-center justify-center mb-3">
                      <Flame className="size-4 text-orange-500" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">Streak</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Duy trì chuỗi ngày học để xây dựng thói quen. Mỗi ngày ôn tập đều đặn là bước tiến lớn!
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
