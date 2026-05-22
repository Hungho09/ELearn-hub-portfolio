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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card variant="interactive-glass" className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 via-transparent to-orange-500/10 hover:shadow-[0_8px_30px_rgba(249,115,22,0.08)] hover:scale-[1.03] duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="size-6 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                          <Flame className="size-3.5 text-orange-500" />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">Chuỗi ngày</span>
                      </div>
                      <p className="text-2xl font-extrabold text-orange-500 mt-1">{stats.streak_days}</p>
                      <p className="text-[10px] text-muted-foreground">ngày liên tiếp</p>
                    </CardContent>
                  </Card>
                  <Card variant="interactive-glass" className="border-primary/20 bg-gradient-to-br from-[#6C5CE7]/5 via-transparent to-[#6C5CE7]/10 hover:shadow-[0_8px_30px_rgba(108,92,231,0.08)] hover:scale-[1.03] duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="size-6 rounded-lg bg-[#6C5CE7]/10 border border-[#6C5CE7]/20 flex items-center justify-center">
                          <BookOpen className="size-3.5 text-primary" />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">Hôm nay</span>
                      </div>
                      <p className="text-2xl font-extrabold text-primary mt-1">{stats.reviews_today}</p>
                      <p className="text-[10px] text-muted-foreground">lần ôn tập</p>
                    </CardContent>
                  </Card>
                  <Card variant="interactive-glass" className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-transparent to-emerald-500/10 hover:shadow-[0_8px_30px_rgba(16,185,129,0.08)] hover:scale-[1.03] duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="size-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <Trophy className="size-3.5 text-emerald-600" />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">Thành thạo</span>
                      </div>
                      <p className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.words_mastered}</p>
                      <p className="text-[10px] text-muted-foreground">từ vựng</p>
                    </CardContent>
                  </Card>
                  <Card variant="interactive-glass" className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-transparent to-purple-500/10 hover:shadow-[0_8px_30px_rgba(168,85,247,0.08)] hover:scale-[1.03] duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="size-6 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                          <Brain className="size-3.5 text-purple-600" />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">Tổng ôn</span>
                      </div>
                      <p className="text-2xl font-extrabold text-purple-600 mt-1">{stats.total_reviews}</p>
                      <p className="text-[10px] text-muted-foreground">lần</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Level & XP Progress */}
                <Card variant="glass">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Star className="size-5 text-cyan-500" />
                      Cấp độ & XP
                    </h2>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="size-14 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
                        <Star className="size-7 text-cyan-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold">Cấp độ {level}</span>
                          <span className="text-xs text-muted-foreground">{xp} / {nextLevelXp} XP</span>
                        </div>
                        <Progress value={levelProgress} className="h-3" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cần thêm {Math.max(0, nextLevelXp - xp)} XP để lên cấp {level + 1}
                    </p>
                  </CardContent>
                </Card>

                {/* Badge Showcase */}
                {stats.badges !== undefined && (
                  <Card variant="glass">
                    <CardContent className="p-6">
                      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Trophy className="size-5 text-amber-500" />
                        Huy hiệu ({stats.badges.length} / 6)
                      </h2>
                      <BadgeGrid unlockedBadges={stats.badges} />
                    </CardContent>
                  </Card>
                )}

                {/* Progress Overview */}
                <Card variant="glass">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <TrendingUp className="size-5 text-primary" />
                      Tổng quan tiến độ
                    </h2>

                    {/* Mastery progress bar */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Mức độ thành thạo</span>
                        <span className="text-sm font-semibold text-primary">{masteryPercent}%</span>
                      </div>
                      <Progress value={masteryPercent} className="h-3" />

                      {/* Breakdown */}
                      <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                        <div className="rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/10 p-3">
                          <p className="text-xl font-bold text-emerald-500">{stats.words_mastered}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center mt-1">
                            <Trophy className="size-3 text-emerald-500" /> Thành thạo
                          </p>
                        </div>
                        <div className="rounded-xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/10 p-3">
                          <p className="text-xl font-bold text-amber-500">{stats.words_learning}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center mt-1">
                            <Target className="size-3 text-amber-500" /> Đang học
                          </p>
                        </div>
                        <div className="rounded-xl bg-white/5 dark:bg-white/5 border border-white/10 p-3">
                          <p className="text-xl font-bold text-muted-foreground">{stats.words_new}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center mt-1">
                            <Layers className="size-3 text-muted-foreground" /> Chưa học
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Study Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card variant="glass">
                    <CardContent className="p-6">
                      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Target className="size-4 text-primary" />
                        Chỉ số học tập
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Từ đã học</span>
                          <span className="text-sm font-semibold">{stats.total_unique_words} từ</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Ease Factor TB</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{stats.average_ease_factor.toFixed(2)}</span>
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-[10px]',
                                stats.average_ease_factor >= 2.5
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : stats.average_ease_factor >= 2.0
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              )}
                            >
                              {overallAccuracy}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">TB ôn/từ</span>
                          <span className="text-sm font-semibold">
                            {stats.total_unique_words > 0
                              ? (stats.total_reviews / stats.total_unique_words).toFixed(1)
                              : '0'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card variant="glass">
                    <CardContent className="p-6">
                      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Clock className="size-4 text-primary" />
                        Tóm tắt hoạt động
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Tổng lần ôn tập</span>
                          <span className="text-sm font-semibold">{stats.total_reviews}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Ôn hôm nay</span>
                          <span className="text-sm font-semibold text-primary">{stats.reviews_today}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Chuỗi ngày học</span>
                          <span className="text-sm font-semibold text-orange-500 flex items-center gap-1">
                            <Flame className="size-3" /> {stats.streak_days} ngày
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Category Progress */}
                {categories.length > 0 && (
                  <Card variant="glass">
                    <CardContent className="p-6">
                      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Layers className="size-5 text-primary" />
                        Tiến độ theo chủ đề
                      </h2>
                      <div className="space-y-4">
                        {categories.map((cat) => {
                          const progressPercent = cat.total_words > 0
                            ? (cat.learned_words / cat.total_words) * 100
                            : 0;
                          const masteryPercent = cat.total_words > 0
                            ? (cat.mastered_words / cat.total_words) * 100
                            : 0;

                          return (
                            <div key={cat.category} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-foreground capitalize">
                                    {cat.category}
                                  </span>
                                  {cat.mastered_words === cat.total_words && cat.total_words > 0 && (
                                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]">
                                      ✓ Hoàn thành
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {cat.learned_words}/{cat.total_words} từ
                                </span>
                              </div>
                              <div className="relative">
                                <Progress value={progressPercent} className="h-2" />
                                {/* Mastery portion overlay */}
                                <div
                                  className="absolute top-0 left-0 h-2 rounded-full bg-emerald-500 transition-all duration-500"
                                  style={{ width: `${masteryPercent}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>Đã học: {cat.learned_words}</span>
                                <span>Thành thạo: {cat.mastered_words}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* No data state */}
                {!loading && stats.total_reviews === 0 && (
                  <Card variant="glass">
                    <CardContent className="p-8 text-center">
                      <BookOpen className="size-12 text-muted-foreground mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-foreground">Chưa có dữ liệu</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Bắt đầu học để xem thống kê tại đây!
                      </p>
                      <Button onClick={() => router.push('/')} className="mt-4 gap-2">
                        Về trang chủ
                      </Button>
                    </CardContent>
                  </Card>
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
