'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Globe,
  Menu,
  Target,
  BrainCircuit,
  Flame,
  Star,
} from 'lucide-react';
import {
  US, JP, KR, DE, FR, CN
} from 'country-flag-icons/react/3x2'
import { Progress } from '@/components/ui/progress';
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
  xpPoints?: number;
  currentLevel?: number;
  nextLevelXp?: number;
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
    flag: <US title="United States" className="size-7" />,
    description: 'Học từ vựng tiếng Anh với phương pháp Active Recall — nhập đáp án và hệ thống tự đánh giá.',
    available: true,
  },
  {
    id: 'japanese',
    name: 'Japanese',
    nativeName: 'Tiếng Nhật',
    flag: <JP title="Japan" className="size-7" />,
    description: 'Học Kanji, Hiragana, Katakana và từ vựng tiếng Nhật.',
    available: false,
  },
  {
    id: 'korean',
    name: 'Korean',
    nativeName: 'Tiếng Hàn',
    flag: <KR title="Korean" className="size-7" />,
    description: 'Học Hangul và từ vựng tiếng Hàn cho người mới bắt đầu.',
    available: false,
  },
  {
    id: 'german',
    name: 'German',
    nativeName: 'Tiếng Đức',
    flag: <DE title="Germany" className="size-7" />,
    description: 'Học từ vựng tiếng Đức với hệ thống ôn tập thông minh.',
    available: false,
  },
  {
    id: 'french',
    name: 'French',
    nativeName: 'Tiếng Pháp',
    flag: <FR title="France" className="size-7" />,
    description: 'Học từ vựng tiếng Pháp từ cơ bản đến nâng cao.',
    available: false,
  },
  {
    id: 'chinese',
    name: 'Chinese',
    nativeName: 'Tiếng Trung',
    flag: <CN title="China" className="size-7" />,
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
      <div className="flex h-screen overflow-hidden bg-transparent">
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

            {/* Welcome & XP Bento Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 md:mt-0">
              {/* Welcome Card (Double Bezel) */}
              <div className="lg:col-span-8 p-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[2rem] shadow-sm">
                <div className="h-full p-6 md:p-8 rounded-[calc(2rem-4px)] bg-[#ffffff]/50 dark:bg-[#0c0c1b]/50 backdrop-blur-2xl border border-white/20 dark:border-white/5 flex flex-col justify-between">
                  <div>
                    <span className="inline-flex rounded-full bg-primary/10 border border-primary/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-bold text-primary dark:text-[#A29BFE] mb-4">
                      Học viên LearnHub
                    </span>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                      Xin chào, {userName}! 👋
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                      Chọn ngôn ngữ phía dưới để bắt đầu hoặc tiếp tục hành trình rèn luyện vốn từ vựng của bạn ngày hôm nay.
                    </p>
                  </div>
                  
                  {/* XP progress bar */}
                  {(stats?.currentLevel ?? session?.user?.currentLevel) !== undefined && (
                    <div className="mt-8 pt-6 border-t border-border/10">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <div className="flex items-center gap-1.5 font-bold text-cyan-600 dark:text-cyan-400">
                          <Star strokeWidth={1.5} className="size-4 text-cyan-500 animate-pulse" />
                          <span>Cấp độ {stats?.currentLevel ?? session?.user?.currentLevel ?? 1}</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">
                          {stats?.xpPoints ?? session?.user?.xpPoints ?? 0} / {stats?.nextLevelXp ?? ((stats?.currentLevel ?? session?.user?.currentLevel ?? 1) ** 2) * 50 + 50} XP
                        </span>
                      </div>
                      <div className="relative">
                        <Progress
                          value={((stats?.xpPoints ?? session?.user?.xpPoints ?? 0) / (stats?.nextLevelXp ?? ((stats?.currentLevel ?? session?.user?.currentLevel ?? 1) ** 2) * 50 + 50)) * 100}
                          className="h-2 rounded-full bg-muted overflow-hidden"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Streak Card (Double Bezel) */}
              <div className="lg:col-span-4 p-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[2rem] shadow-sm">
                <div className="h-full p-6 md:p-8 rounded-[calc(2rem-4px)] bg-[#ffffff]/50 dark:bg-[#0c0c1b]/50 backdrop-blur-2xl border border-white/20 dark:border-white/5 flex flex-col justify-between items-center text-center relative overflow-hidden group">
                  <div className="absolute -top-10 -right-10 size-32 rounded-full bg-orange-500/10 blur-2xl group-hover:scale-125 transition-transform duration-700 ease-out pointer-events-none" />
                  
                  <div className="flex flex-col items-center mt-2">
                    <div className="size-16 rounded-2xl bg-orange-500/10 border border-orange-500/15 flex items-center justify-center text-orange-500 shadow-sm transition-all duration-700 group-hover:scale-110 group-hover:rotate-6">
                      <Flame strokeWidth={1.2} className="size-8 text-orange-500 animate-pulse" />
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mt-4">
                      Chuỗi ngày học
                    </span>
                    <h2 className="text-4xl font-black text-foreground mt-2 tracking-tight">
                      {stats ? stats.streak_days : 0} ngày
                    </h2>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed mt-4 max-w-[180px]">
                    {stats && stats.streak_days > 0 
                      ? "Tuyệt vời! Hãy tiếp tục duy trì thói quen học tập hàng ngày nhé."
                      : "Bắt đầu học ngay hôm nay để kích hoạt chuỗi ngày streak!"}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            {stats && (
              <div className="mt-8">
                <LearningStats
                  totalReviews={stats.total_reviews}
                  wordsMastered={stats.words_mastered}
                  wordsLearning={stats.words_learning}
                  streakDays={stats.streak_days}
                  reviewsToday={stats.reviews_today}
                  currentLevel={stats?.currentLevel ?? session?.user?.currentLevel ?? 1}
                />
              </div>
            )}

            {/* Language Selection */}
            <div className="mt-10">
              <span className="inline-flex rounded-full bg-primary/10 border border-primary/10 px-3 py-1 text-[9px] uppercase tracking-[0.2em] font-bold text-primary dark:text-[#A29BFE] mb-2">
                Học ngôn ngữ
              </span>
              <h2 className="text-xl font-extrabold text-foreground mb-6 tracking-tight">
                Chọn ngôn ngữ học tập
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

            {/* Quick Tips Section (Asymmetric Bento Grid) */}
            <div className="mt-12 mb-8">
              <span className="inline-flex rounded-full bg-emerald-500/10 border border-emerald-500/10 px-3 py-1 text-[9px] uppercase tracking-[0.2em] font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                Kinh nghiệm học
              </span>
              <h2 className="text-xl font-extrabold text-foreground mb-6 tracking-tight">
                Mẹo học tập hiệu quả
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                {/* Tip 1 (Active Recall) - Bento Column Span 2 */}
                <div className="sm:col-span-2 p-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[2rem] shadow-sm hover:scale-[1.01] hover:shadow-[0_8px_30px_rgba(108,92,231,0.06)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group">
                  <div className="h-full p-6 rounded-[calc(2rem-4px)] bg-[#ffffff]/55 dark:bg-[#0c0c1b]/55 backdrop-blur-2xl border border-white/20 dark:border-white/5">
                    <div className="size-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-4 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-110">
                      <Target strokeWidth={1.2} className="size-4 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground text-sm tracking-tight">Active Recall (Nhớ chủ động)</h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      Nhập đáp án tự đánh giá thay vì chỉ nhìn lướt qua. Hệ thống chấm điểm tự động thông minh giúp bạn học sâu và trung thực hơn với bản thân.
                    </p>
                  </div>
                </div>

                {/* Tip 2 (Spaced Repetition) - Bento Column Span 1 */}
                <div className="sm:col-span-1 p-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[2rem] shadow-sm hover:scale-[1.01] hover:shadow-[0_8px_30px_rgba(16,185,129,0.06)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group">
                  <div className="h-full p-6 rounded-[calc(2rem-4px)] bg-[#ffffff]/55 dark:bg-[#0c0c1b]/55 backdrop-blur-2xl border border-white/20 dark:border-white/5">
                    <div className="size-9 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center mb-4 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-110">
                      <BrainCircuit strokeWidth={1.2} className="size-4 text-emerald-500" />
                    </div>
                    <h3 className="font-bold text-foreground text-sm tracking-tight">Spaced Repetition</h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      Thuật toán TGCL thông minh tự động tính toán thời gian phản hồi để tối ưu lịch ôn tập của bạn.
                    </p>
                  </div>
                </div>

                {/* Tip 3 (Streak) - Bento Column Span 1 */}
                <div className="sm:col-span-1 p-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[2rem] shadow-sm hover:scale-[1.01] hover:shadow-[0_8px_30px_rgba(249,115,22,0.06)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group">
                  <div className="h-full p-6 rounded-[calc(2rem-4px)] bg-[#ffffff]/55 dark:bg-[#0c0c1b]/55 backdrop-blur-2xl border border-white/20 dark:border-white/5">
                    <div className="size-9 rounded-xl bg-orange-500/10 border border-orange-500/15 flex items-center justify-center mb-4 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-110">
                      <Flame strokeWidth={1.2} className="size-4 text-orange-500" />
                    </div>
                    <h3 className="font-bold text-foreground text-sm tracking-tight">Thói quen hàng ngày</h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      Duy trì ôn tập đều đặn giúp bạn nhớ lâu hơn và củng cố kiến thức mỗi ngày.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
