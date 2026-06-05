'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  BarChart3,
  Flame,
  BookOpen,
  Brain,
  Trophy,
  Target,
  Clock,
  TrendingUp,
  Layers,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/home/Sidebar';
import { BadgeGrid } from '@/components/study/BadgeGrid';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────

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
  badges?: string[];
}

interface CategoryProgress {
  category: string;
  total_words: number;
  learned_words: number;
  mastered_words: number;
  average_ease_factor: number;
}

// ─── Main Component ──────────────────────────────────────────────

export default function StatsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [categories, setCategories] = useState<CategoryProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user?.id || session?.user?.email || 'guest';

  // Load stats and categories
  const loadData = useCallback(async () => {
    if (status === 'loading') return;
    try {
      setLoading(true);
      setError(null);

      const [statsRes, catRes] = await Promise.allSettled([
        fetch(`/api/flashcards/stats?user_id=${encodeURIComponent(userId)}`),
        fetch(`/api/flashcards/categories?user_id=${encodeURIComponent(userId)}`),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        setStats(await statsRes.value.json());
      }
      if (catRes.status === 'fulfilled' && catRes.value.ok) {
        setCategories(await catRes.value.json());
      }
    } catch (err) {
      setError('Không thể tải thống kê. Vui lòng thử lại.');
      console.error('Stats load error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, status]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Computed values ──────────────────────────────────────
  const masteryPercent = stats
    ? stats.total_unique_words > 0
      ? Math.round((stats.words_mastered / stats.total_unique_words) * 100)
      : 0
    : 0;

  const overallAccuracy = stats
    ? stats.average_ease_factor >= 2.5
      ? 'Tốt'
      : stats.average_ease_factor >= 2.0
        ? 'Trung bình'
        : 'Cần cải thiện'
    : '-';

  const level = stats?.currentLevel ?? 1;
  const xp = stats?.xpPoints ?? 0;
  const nextLevelXp = stats?.nextLevelXp ?? ((level ** 2) * 50 + 50);
  const levelProgress = nextLevelXp > 0 ? Math.min((xp / nextLevelXp) * 100, 100) : 0;

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
                  className="md:hidden"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu className="size-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <BarChart3 className="size-6 text-primary" />
                    Thống kê học tập
                  </h1>
                  <p className="text-sm text-muted-foreground">Theo dõi tiến độ và hiệu quả học tập</p>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
                {error}
                <Button variant="link" size="sm" onClick={() => setError(null)} className="ml-2">
                  Đóng
                </Button>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="mt-12 flex flex-col items-center justify-center gap-4">
                <div className="size-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground">Đang tải thống kê...</p>
              </div>
            )}

            {/* ─── Content ──────────────────────────────── */}
            {!loading && stats && (
              <div className="mt-6 space-y-6">
                {/* Top Stats Grid */}
                {/* Top Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  
                  {/* Streak Card */}
                  <div className="p-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl shadow-sm hover:scale-[1.03] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group">
                    <div className="h-full p-4 rounded-[calc(1rem-4px)] bg-[#ffffff]/50 dark:bg-[#0c0c1b]/50 backdrop-blur-2xl border border-white/20 dark:border-white/5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="size-6 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
                            <Flame strokeWidth={1.2} className="size-3.5 text-orange-500" />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Chuỗi ngày</span>
                        </div>
                        <p className="text-2xl font-black text-orange-500 mt-1">{stats.streak_days}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2 font-medium">ngày liên tiếp</p>
                    </div>
                  </div>

                  {/* Today Card */}
                  <div className="p-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl shadow-sm hover:scale-[1.03] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group">
                    <div className="h-full p-4 rounded-[calc(1rem-4px)] bg-[#ffffff]/50 dark:bg-[#0c0c1b]/50 backdrop-blur-2xl border border-white/20 dark:border-white/5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="size-6 rounded-lg bg-[#6C5CE7]/10 border border-[#6C5CE7]/20 flex items-center justify-center transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
                            <BookOpen strokeWidth={1.2} className="size-3.5 text-primary dark:text-[#A29BFE]" />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Hôm nay</span>
                        </div>
                        <p className="text-2xl font-black text-primary dark:text-[#A29BFE] mt-1">{stats.reviews_today}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2 font-medium">lượt ôn tập</p>
                    </div>
                  </div>

                  {/* Mastered Card */}
                  <div className="p-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl shadow-sm hover:scale-[1.03] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group">
                    <div className="h-full p-4 rounded-[calc(1rem-4px)] bg-[#ffffff]/50 dark:bg-[#0c0c1b]/50 backdrop-blur-2xl border border-white/20 dark:border-white/5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="size-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
                            <Trophy strokeWidth={1.2} className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Thành thạo</span>
                        </div>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.words_mastered}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2 font-medium">từ vựng</p>
                    </div>
                  </div>

                  {/* Total Reviews Card */}
                  <div className="p-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl shadow-sm hover:scale-[1.03] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group">
                    <div className="h-full p-4 rounded-[calc(1rem-4px)] bg-[#ffffff]/50 dark:bg-[#0c0c1b]/50 backdrop-blur-2xl border border-white/20 dark:border-white/5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="size-6 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
                            <Brain strokeWidth={1.2} className="size-3.5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Tổng ôn</span>
                        </div>
                        <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{stats.total_reviews}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2 font-medium">lần</p>
                    </div>
                  </div>
                </div>

                {/* Level & XP Progress (Double Bezel) */}
                <div className="p-1.5 rounded-[2rem] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm">
                  <div className="p-6 md:p-8 rounded-[calc(2rem-6px)] bg-[#ffffff]/50 dark:bg-[#0c0c1b]/50 backdrop-blur-2xl border border-white/20 dark:border-white/5">
                    <h2 className="text-base font-extrabold text-foreground mb-4 flex items-center gap-2">
                      <Star strokeWidth={1.2} className="size-5 text-cyan-500" />
                      Cấp độ & XP
                    </h2>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                      <div className="size-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/15 shrink-0 shadow-sm">
                        <Star strokeWidth={1.5} className="size-7 text-cyan-500 animate-pulse" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-extrabold text-foreground">Cấp độ {level}</span>
                          <span className="text-xs text-muted-foreground font-medium">{xp} / {nextLevelXp} XP</span>
                        </div>
                        <Progress value={levelProgress} className="h-2.5 rounded-full" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 font-medium">
                      Cần thêm <span className="font-bold text-cyan-500">{Math.max(0, nextLevelXp - xp)} XP</span> để lên cấp {level + 1}
                    </p>
                  </div>
                </div>

                {/* Badge Showcase (Double Bezel) */}
                {stats.badges !== undefined && (
                  <div className="p-1.5 rounded-[2rem] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm">
                    <div className="p-6 md:p-8 rounded-[calc(2rem-6px)] bg-[#ffffff]/50 dark:bg-[#0c0c1b]/50 backdrop-blur-2xl border border-white/20 dark:border-white/5">
                      <h2 className="text-base font-extrabold text-foreground mb-4 flex items-center gap-2">
                        <Trophy strokeWidth={1.2} className="size-5 text-amber-500" />
                        Huy hiệu ({stats.badges.length} / 6)
                      </h2>
                      <BadgeGrid unlockedBadges={stats.badges} />
                    </div>
                  </div>
                )}

                {/* Progress Overview (Double Bezel) */}
                <div className="p-1.5 rounded-[2rem] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm">
                  <div className="p-6 md:p-8 rounded-[calc(2rem-6px)] bg-[#ffffff]/50 dark:bg-[#0c0c1b]/50 backdrop-blur-2xl border border-white/20 dark:border-white/5">
                    <h2 className="text-base font-extrabold text-foreground mb-5 flex items-center gap-2">
                      <TrendingUp strokeWidth={1.2} className="size-5 text-primary" />
                      Tổng quan tiến độ thành thạo
                    </h2>

                    {/* Mastery progress bar */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Mức độ thành thạo</span>
                        <span className="text-sm font-extrabold text-primary">{masteryPercent}%</span>
                      </div>
                      <Progress value={masteryPercent} className="h-2.5 rounded-full" />

                      {/* Breakdown */}
                      <div className="grid grid-cols-3 gap-4 mt-6 text-center">
                        <div className="rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/10 p-4">
                          <p className="text-2xl font-black text-emerald-500 leading-none">{stats.words_mastered}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-center mt-2.5 font-bold uppercase tracking-wider">
                            <Trophy strokeWidth={1.2} className="size-3.5 text-emerald-500" /> Thành thạo
                          </p>
                        </div>
                        <div className="rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/10 p-4">
                          <p className="text-2xl font-black text-amber-500 leading-none">{stats.words_learning}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 justify-center mt-2.5 font-bold uppercase tracking-wider">
                            <Target strokeWidth={1.2} className="size-3.5 text-amber-500" /> Đang học
                          </p>
                        </div>
                        <div className="rounded-2xl bg-black/5 dark:bg-white/5 border border-border/10 p-4">
                          <p className="text-2xl font-black text-muted-foreground leading-none">{stats.words_new}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-center mt-2.5 font-bold uppercase tracking-wider">
                            <Layers strokeWidth={1.2} className="size-3.5 text-muted-foreground" /> Chưa học
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Study Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  
                  {/* Accuracy card */}
                  <div className="p-1 rounded-[2rem] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm">
                    <div className="p-6 rounded-[calc(2rem-4px)] bg-[#ffffff]/50 dark:bg-[#0c0c1b]/50 backdrop-blur-2xl border border-white/20 dark:border-white/5">
                      <h3 className="text-sm font-extrabold text-foreground mb-4 flex items-center gap-2">
                        <Target strokeWidth={1.2} className="size-4 text-primary" />
                        Chỉ số học tập
                      </h3>
                      <div className="space-y-3.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground font-medium">Từ đã học</span>
                          <span className="font-extrabold text-foreground">{stats.total_unique_words} từ</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground font-medium">Ease Factor TB</span>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-foreground">{stats.average_ease_factor.toFixed(2)}</span>
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-[9px] font-bold rounded-full px-2.5 py-0.5 border',
                                stats.average_ease_factor >= 2.5
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-500/25'
                                  : stats.average_ease_factor >= 2.0
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-500/25'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-500/25'
                              )}
                            >
                              {overallAccuracy}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground font-medium">TB ôn/từ</span>
                          <span className="font-extrabold text-foreground">
                            {stats.total_unique_words > 0
                              ? (stats.total_reviews / stats.total_unique_words).toFixed(1)
                              : '0'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary card */}
                  <div className="p-1 rounded-[2rem] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm">
                    <div className="p-6 rounded-[calc(2rem-4px)] bg-[#ffffff]/50 dark:bg-[#0c0c1b]/50 backdrop-blur-2xl border border-white/20 dark:border-white/5">
                      <h3 className="text-sm font-extrabold text-foreground mb-4 flex items-center gap-2">
                        <Clock strokeWidth={1.2} className="size-4 text-primary" />
                        Tóm tắt hoạt động
                      </h3>
                      <div className="space-y-3.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground font-medium">Tổng lần ôn tập</span>
                          <span className="font-extrabold text-foreground">{stats.total_reviews}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground font-medium">Ôn hôm nay</span>
                          <span className="font-extrabold text-primary">{stats.reviews_today}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground font-medium">Chuỗi ngày học</span>
                          <span className="font-extrabold text-orange-500 flex items-center gap-1.5">
                            <Flame strokeWidth={1.5} className="size-3.5" /> {stats.streak_days} ngày
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Progress */}
                {categories.length > 0 && (
                  <div className="p-1.5 rounded-[2rem] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm">
                    <div className="p-6 md:p-8 rounded-[calc(2rem-6px)] bg-[#ffffff]/50 dark:bg-[#0c0c1b]/50 backdrop-blur-2xl border border-white/20 dark:border-white/5">
                      <h2 className="text-base font-extrabold text-foreground mb-5 flex items-center gap-2">
                        <Layers strokeWidth={1.2} className="size-5 text-primary" />
                        Tiến độ theo chủ đề
                      </h2>
                      <div className="space-y-5">
                        {categories.map((cat) => {
                          const progressPercent = cat.total_words > 0
                            ? (cat.learned_words / cat.total_words) * 100
                            : 0;
                          const masteryPercent = cat.total_words > 0
                            ? (cat.mastered_words / cat.total_words) * 100
                            : 0;

                          return (
                            <div key={cat.category} className="space-y-2.5">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-foreground capitalize">
                                    {cat.category}
                                  </span>
                                  {cat.mastered_words === cat.total_words && cat.total_words > 0 && (
                                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[9px] font-bold rounded-full px-2 py-0.2">
                                      ✓ Hoàn thành
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-muted-foreground font-medium">
                                  {cat.learned_words}/{cat.total_words} từ
                                </span>
                              </div>
                              <div className="relative">
                                <Progress value={progressPercent} className="h-2 rounded-full" />
                                {/* Mastery portion overlay */}
                                <div
                                  className="absolute top-0 left-0 h-2 rounded-full bg-emerald-500 transition-all duration-500"
                                  style={{ width: `${masteryPercent}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                                <span>Đã học: {cat.learned_words}</span>
                                <span>Thành thạo: {cat.mastered_words}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* No data state */}
                {!loading && stats.total_reviews === 0 && (
                  <div className="p-1.5 rounded-[2rem] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm">
                    <div className="p-8 text-center rounded-[calc(2rem-6px)] bg-[#ffffff]/50 dark:bg-[#0c0c1b]/50 backdrop-blur-2xl border border-white/20 dark:border-white/5">
                      <BookOpen strokeWidth={1.2} className="size-12 text-muted-foreground mx-auto mb-3" />
                      <h3 className="text-base font-bold text-foreground">Chưa có dữ liệu</h3>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Bắt đầu học để xem thống kê tại đây!
                      </p>
                      <Button onClick={() => router.push('/')} className="mt-5 gap-2 rounded-full px-6 text-xs font-bold shadow-md shadow-primary/20">
                        Về trang chủ
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No session state */}
            {!loading && !stats && !error && (
              <div className="mt-12 flex flex-col items-center gap-4">
                <BarChart3 className="size-16 text-muted-foreground" />
                <h2 className="text-2xl font-bold">Thống kê học tập</h2>
                <p className="text-muted-foreground text-center max-w-md">
                  Đăng nhập và bắt đầu học để xem thống kê chi tiết về tiến độ của bạn.
                </p>
                <Button onClick={() => router.push('/login')} className="gap-2">
                  Đăng nhập
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
