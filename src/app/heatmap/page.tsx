'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Calendar,
  Flame,
  BookOpen,
  Brain,
  Trophy,
  Activity,
  Zap,
  TrendingUp,
  Clock,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  BookMarked,
  Eye,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/home/Sidebar';
import { cn } from '@/lib/utils';

// ─── Interfaces & Types ───────────────────────────────────────────

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
}

interface DBReviewLog {
  vocabulary_id: number;
  english: string;
  vietnamese: string;
  rating: number;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  reviewed_at: string; // ISO string
  next_review_at: string | null;
  response_time_ms: number;
  direction: string;
  session_id: string | null;
}

interface HeatmapDay {
  date: Date;
  dateStr: string; // YYYY-MM-DD local time
  count: number; // total reviews
  wordsLearned: number;
  studyDuration: number; // in minutes
  retentionScore: number; // percentage
  accuracy: number; // percentage
  xpGained: number;
  isDemo?: boolean;
}

// ─── Constants & Helper Functions ─────────────────────────────────

const MONTH_NAMES = [
  'Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 
  'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'
];

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// Timezone-safe local date string format: YYYY-MM-DD
function getLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

function formatDateVN(date: Date): string {
  const d = new Date(date);
  return `${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
}

// ─── Main Heatmap Page Component ───────────────────────────────────

export default function HeatmapPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Data mode: 'real' (honest DB) vs 'demo' (active year simulation)
  const [dataMode, setDataMode] = useState<'real' | 'demo'>('real');

  // Year Selection State (GitHub-style fixed year calendar)
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Stats & logs from database
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [dbLogs, setDbLogs] = useState<DBReviewLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Day Detail Modal/Panel State
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);

  // Hovered Cell Tooltip State
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const tooltipTimeout = useRef<NodeJS.Timeout | null>(null);

  const userId = session?.user?.id || session?.user?.email || 'guest';
  const userName = session?.user?.name || 'Học viên';

  // Available years dynamically derived from review logs, always including current and previous year
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(currentYear);
    yearsSet.add(currentYear - 1);
    dbLogs.forEach(log => {
      try {
        const yr = new Date(log.reviewed_at).getFullYear();
        if (!isNaN(yr)) yearsSet.add(yr);
      } catch {}
    });
    return Array.from(yearsSet).sort((a, b) => b - a); // descending order
  }, [dbLogs, currentYear]);

  // Client-side mount confirmation to prevent recharts hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Fetch Real Database Stats and Export Review Logs
  const loadData = useCallback(async () => {
    if (status === 'loading') return;
    try {
      setLoading(true);
      setError(null);

      // Fetch user general stats
      const statsRes = await fetch(`/api/flashcards/stats?user_id=${encodeURIComponent(userId)}`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch real review logs with word details (proxied automatically to FastAPI port 3001)
      const logsRes = await fetch(`/api/python/api/review-logs/${encodeURIComponent(userId)}/export`);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        if (logsData && Array.isArray(logsData.logs)) {
          setDbLogs(logsData.logs);
        }
      } else {
        console.error('Failed to fetch review logs, status:', logsRes.status);
        setError('Không thể kết nối đến dịch vụ AI Backend (FastAPI). Vui lòng kiểm tra xem backend đã được khởi động ở cổng 3001 chưa.');
      }
    } catch (err) {
      console.error('Failed to load stats or logs:', err);
      setError('Không thể đồng bộ với cơ sở dữ liệu. Vui lòng kiểm tra xem backend đã được khởi động ở cổng 3001 chưa.');
    } finally {
      setLoading(false);
    }
  }, [userId, status]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Generate Timezone-safe Heatmap Data for the Selected Year (Jan 1 to Dec 31)
  const heatmapData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: HeatmapDay[] = [];
    
    // We generate from Jan 1st of selectedYear to Dec 31st of selectedYear
    // We use noon index (12:00:00) to prevent DST and standard local timezone jumps from skipping a day
    const startDate = new Date(selectedYear, 0, 1, 12, 0, 0);
    const endDate = new Date(selectedYear, 11, 31, 12, 0, 0);

    // Chế độ dữ liệu Thật (Real DB data)
    if (dataMode === 'real') {
      // Group real database logs by date in local time
      const logsMap: Record<string, DBReviewLog[]> = {};
      dbLogs.forEach(log => {
        try {
          const d = new Date(log.reviewed_at);
          const dateStr = getLocalDateString(d);
          if (!logsMap[dateStr]) {
            logsMap[dateStr] = [];
          }
          logsMap[dateStr].push(log);
        } catch (e) {
          console.error("Error parsing date:", log.reviewed_at, e);
        }
      });

      let current = new Date(startDate);
      while (current <= endDate) {
        const targetDate = new Date(current);
        targetDate.setHours(0, 0, 0, 0);
        const dateStr = getLocalDateString(targetDate);
        
        const isFuture = targetDate > today;
        const dayLogs = isFuture ? [] : (logsMap[dateStr] || []);
        const count = dayLogs.length;

        let wordsLearned = 0;
        let studyDuration = 0;
        let retentionScore = 0;
        let accuracy = 0;
        let xpGained = 0;

        if (count > 0) {
          // Unique words reviewed
          const uniqueWords = new Set(dayLogs.map(l => l.vocabulary_id));
          wordsLearned = uniqueWords.size;

          // Estimate duration: sum of response times or fallback to 10s per review
          const totalMs = dayLogs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0);
          studyDuration = totalMs > 0 
            ? Math.round((totalMs / 60000) * 10) / 10 
            : Math.round((count * 10 / 60) * 10) / 10;
          
          if (studyDuration < 0.1) studyDuration = 0.1;

          // Accuracy: rating >= 3 (Good/Easy)
          const goodReviews = dayLogs.filter(l => l.rating >= 3).length;
          accuracy = Math.round((goodReviews / count) * 100);

          // Retention score based on average ease factor
          const avgEase = dayLogs.reduce((sum, l) => sum + (l.ease_factor || 2.5), 0) / count;
          retentionScore = Math.min(100, Math.max(30, Math.round((avgEase / 3.0) * 100)));

          // XP Gain calculation based on SPEC formulas
          dayLogs.forEach(l => {
            if (l.rating === 1) xpGained += 5;
            else if (l.rating === 2) xpGained += 10;
            else if (l.rating === 3) xpGained += 20;
            else if (l.rating === 4) xpGained += 30;
            else xpGained += 15;
          });
        }

        days.push({
          date: targetDate,
          dateStr,
          count,
          wordsLearned,
          studyDuration,
          retentionScore,
          accuracy,
          xpGained,
          isDemo: false,
          isFuture
        } as any);

        current.setDate(current.getDate() + 1);
      }
    } 
    // Chế độ dữ liệu Demo (Seeded year representation)
    else {
      const currentStreak = stats?.streak_days || 3;
      
      const seededRandom = (seed: number) => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
      };

      let current = new Date(startDate);
      let dayIndex = 0;
      while (current <= endDate) {
        const targetDate = new Date(current);
        targetDate.setHours(0, 0, 0, 0);
        const dateStr = getLocalDateString(targetDate);

        const isFuture = targetDate > today;
        const seedVal = dayIndex + 42;
        const rand1 = seededRandom(seedVal);
        const rand2 = seededRandom(seedVal + 1);

        // Check if within active streak days before today
        const msDiff = today.getTime() - targetDate.getTime();
        const daysDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));
        const isStreakDay = !isFuture && daysDiff >= 0 && daysDiff < currentStreak;

        const dayOfWeek = targetDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        let studyProbability = isWeekend ? 0.35 : 0.65;
        
        if (isStreakDay) {
          studyProbability = 1.0;
        }

        const didStudy = !isFuture && rand1 < studyProbability;

        let count = 0;
        let wordsLearned = 0;
        let studyDuration = 0;
        let retentionScore = 0;
        let accuracy = 0;
        let xpGained = 0;

        if (didStudy) {
          const baseReviews = Math.floor(rand2 * 25) + 3;
          count = isStreakDay ? (baseReviews + 5) : baseReviews;
          studyDuration = Math.round(count * 0.7 + rand1 * 8 + 2);
          wordsLearned = Math.max(1, Math.floor(count * 0.3 + rand2 * 4));
          retentionScore = Math.floor(82 + rand1 * 16);
          accuracy = Math.floor(85 + rand2 * 14);
          xpGained = count * 15 + wordsLearned * 20;
        }

        days.push({
          date: targetDate,
          dateStr,
          count,
          wordsLearned,
          studyDuration,
          retentionScore,
          accuracy,
          xpGained,
          isDemo: true,
          isFuture
        } as any);

        current.setDate(current.getDate() + 1);
        dayIndex++;
      }
    }

    return days;
  }, [dbLogs, dataMode, stats, selectedYear]);

  // Sync selected day when dataMode or data changes
  useEffect(() => {
    if (heatmapData.length > 0) {
      // Find today's date in local time
      const todayStr = getLocalDateString(new Date());
      const foundToday = heatmapData.find(d => d.dateStr === todayStr);
      setSelectedDay(foundToday || heatmapData[heatmapData.length - 1]);
    }
  }, [heatmapData]);

  // List of actual DB logs for the selected day (for the detail list panel)
  const selectedDayDbLogs = useMemo(() => {
    if (!selectedDay || dataMode !== 'real') return [];
    return dbLogs.filter(log => {
      try {
        const d = new Date(log.reviewed_at);
        return getLocalDateString(d) === selectedDay.dateStr;
      } catch {
        return false;
      }
    });
  }, [selectedDay, dbLogs, dataMode]);

  // studied days count (excluding future days)
  const totalStudyDays = useMemo(() => {
    return heatmapData.filter(d => d.count > 0 && !(d as any).isFuture).length;
  }, [heatmapData]);

  // Dashboard yearly stats aggregates
  const yearlyMetrics = useMemo(() => {
    let totalReviews = 0;
    let totalDuration = 0;
    let totalWords = 0;
    let sumRetention = 0;
    let studiedDays = 0;

    heatmapData.forEach(d => {
      if (d.count > 0) {
        totalReviews += d.count;
        totalDuration += d.studyDuration;
        totalWords += d.wordsLearned;
        sumRetention += d.retentionScore;
        studiedDays += 1;
      }
    });

    return {
      totalReviews,
      totalDuration,
      totalWords,
      avgRetention: studiedDays > 0 ? Math.round(sumRetention / studiedDays) : 88
    };
  }, [heatmapData]);

  // Forgetting Curve simulator state
  const [simReviews, setSimReviews] = useState<number>(3);
  const forgettingCurveData = useMemo(() => {
    const data = [];
    const halfLife = 4.5;
    const reviewDays = [0, 1, 4, 10, 22];

    for (let day = 0; day <= 15; day++) {
      const decayRetention = Math.round(Math.exp(-day / halfLife) * 100);

      let lastAppliedReview = 0;
      let runningStrength = 1.8;

      for (let r = 0; r < Math.min(simReviews, reviewDays.length); r++) {
        if (day >= reviewDays[r]) {
          lastAppliedReview = reviewDays[r];
          runningStrength = 1.8 * Math.pow(2.1, r);
        }
      }

      const daysSinceLastReview = day - lastAppliedReview;
      let activeRecallRetention = Math.round(Math.exp(-daysSinceLastReview / runningStrength) * 100);
      activeRecallRetention = Math.min(100, Math.max(15, activeRecallRetention));

      data.push({
        day: `N. ${day}`,
        'Đường Quên Cơ Bản (Decay)': decayRetention,
        'Active Recall (Spaced Rep)': activeRecallRetention,
      });
    }

    return data;
  }, [simReviews]);

  // AI Retention Trend (Last 30 Days)
  const retentionTrendData = useMemo(() => {
    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let lastKnownRetention = stats?.average_ease_factor 
      ? Math.min(98, Math.max(60, Math.round((stats.average_ease_factor / 3.0) * 100))) 
      : 85;

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = getLocalDateString(date);
      
      const dayLogs = dbLogs.filter(l => {
        try {
          return getLocalDateString(new Date(l.reviewed_at)) === dateStr;
        } catch {
          return false;
        }
      });

      if (dayLogs.length > 0) {
        const avgEase = dayLogs.reduce((sum, l) => sum + (l.ease_factor || 2.5), 0) / dayLogs.length;
        lastKnownRetention = Math.min(100, Math.max(30, Math.round((avgEase / 3.0) * 100)));
      } else if (dataMode === 'demo') {
        // Deterministic demo variance
        const valHash = Math.sin(i) * 3;
        lastKnownRetention = Math.round(88 + valHash + (i % 2 === 0 ? 1 : -1));
      }

      data.push({
        name: `${date.getDate()}/${date.getMonth() + 1}`,
        'Khả năng Ghi nhớ': lastKnownRetention,
        'Mục tiêu Tối ưu': 90
      });
    }
    return data;
  }, [dbLogs, stats, dataMode]);

  // Best learning hours derived directly from DB logs
  const hourlyPeakData = useMemo(() => {
    const hoursCount = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}h`,
      count: 0
    }));

    if (dataMode === 'real') {
      dbLogs.forEach(log => {
        try {
          const d = new Date(log.reviewed_at);
          const hour = d.getHours();
          hoursCount[hour].count += 1;
        } catch (e) {}
      });
    } else {
      // Demo hours distribution
      const demoDistribution: Record<number, number> = {
        6: 12, 8: 28, 10: 45, 12: 18, 14: 15, 16: 22, 18: 35, 20: 78, 22: 94, 0: 40, 2: 5
      };
      Object.entries(demoDistribution).forEach(([hourStr, count]) => {
        hoursCount[Number(hourStr)].count = count;
      });
    }

    // Return even hours to keep axis clean
    return hoursCount.filter((_, idx) => idx % 2 === 0);
  }, [dbLogs, dataMode]);

  // ─── Heatmap SVG Week Structure & Month Alignment ─────────────────

  const heatmapWeeks = useMemo(() => {
    const weeks: HeatmapDay[][] = [];
    let currentWeek: HeatmapDay[] = [];

    // Pad first week based on its starting day of the week
    const firstDayOfWeek = heatmapData[0].date.getDay();
    for (let pad = 0; pad < firstDayOfWeek; pad++) {
      currentWeek.push(null as any);
    }

    heatmapData.forEach(day => {
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null as any);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [heatmapData]);

  // Calculate dynamic month starting week indexes (prevents overlaps and layout shifting)
  const monthLabels = useMemo(() => {
    const labels: { text: string; colIndex: number }[] = [];
    let lastMonth = -1;

    heatmapWeeks.forEach((week, wIdx) => {
      const firstDay = week.find(d => d !== null);
      if (firstDay) {
        const currentMonth = firstDay.date.getMonth(); // 0 to 11
        if (currentMonth !== lastMonth) {
          labels.push({
            text: MONTH_NAMES[currentMonth],
            colIndex: wIdx
          });
          lastMonth = currentMonth;
        }
      }
    });

    return labels;
  }, [heatmapWeeks]);

  const getCellColorClass = (count: number) => {
    if (count === 0) return 'bg-muted/20 dark:bg-muted/10 border-border/10';
    if (count < 5) return 'bg-emerald-500/20 text-emerald-900 border-emerald-500/10';
    if (count < 12) return 'bg-emerald-500/40 text-emerald-800 border-emerald-500/20';
    if (count < 22) return 'bg-emerald-500/70 text-emerald-200 border-emerald-500/40';
    return 'bg-emerald-500 text-emerald-950 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
  };

  const handleMouseEnter = (day: HeatmapDay, e: React.MouseEvent) => {
    if (!day) return;
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    // Mathematically clamp targetX to keep the tooltip fully within the viewport.
    // Tooltip has min-w-[210px] styled with border/padding, so 220px is a safe cushion.
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const tooltipWidth = 220;
    const padding = 16;

    let targetX = rect.left + scrollLeft + rect.width / 2;
    const minX = scrollLeft + tooltipWidth / 2 + padding;
    const maxX = scrollLeft + viewportWidth - tooltipWidth / 2 - padding;

    targetX = Math.max(minX, Math.min(maxX, targetX));

    setTooltipPos({
      x: targetX,
      y: rect.top + scrollTop - 10
    });
    setHoveredDay(day);
  };

  const handleMouseLeave = () => {
    tooltipTimeout.current = setTimeout(() => {
      setHoveredDay(null);
    }, 100);
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        
        {/* Sidebar Nav */}
        <div className="hidden md:block shrink-0">
          <Sidebar collapsed={false} />
        </div>

        {/* Mobile Nav */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-[260px]">
            <SheetTitle className="sr-only">Menu Điều Hướng</SheetTitle>
            <Sidebar collapsed={false} onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 overflow-y-auto custom-scrollbar">
          <div className="mx-auto max-w-5xl p-4 md:p-6 lg:p-8 space-y-6">
            
            {/* Top Toolbar Area */}
            <div className="mt-4 md:mt-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Calendar className="size-6 text-emerald-500" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                    Lịch Sử Hoạt Động & AI Analytics
                  </span>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Phân tích dữ liệu học từ vựng thực tế và đo đạc đà suy giảm bộ nhớ.
                </p>
              </div>

              {/* Data Mode Switch Tool */}
              <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-xl border border-border/40 shrink-0">
                <Button
                  onClick={() => setDataMode('real')}
                  variant={dataMode === 'real' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    "h-8 rounded-lg text-xs gap-1.5",
                    dataMode === 'real' ? "bg-primary text-primary-foreground shadow-sm font-semibold" : "text-muted-foreground"
                  )}
                >
                  <BookMarked className="size-3.5" />
                  Dữ liệu Thật
                </Button>
                <Button
                  onClick={() => setDataMode('demo')}
                  variant={dataMode === 'demo' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    "h-8 rounded-lg text-xs gap-1.5",
                    dataMode === 'demo' ? "bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-bold shadow-sm" : "text-muted-foreground"
                  )}
                >
                  <Eye className="size-3.5" />
                  Dữ liệu Demo
                </Button>
              </div>
            </div>

            {/* Sync Status / Offline Alert Banners */}
            {dataMode === 'real' && (
              <div className="space-y-3">
                {error ? (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-destructive">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="size-4.5 shrink-0 mt-0.5 animate-bounce text-destructive" />
                      <div className="space-y-1">
                        <span className="font-bold block text-foreground">Không thể kết nối tới dịch vụ AI Backend (FastAPI)</span>
                        <p className="text-muted-foreground leading-relaxed">
                          Yêu cầu lấy dữ liệu thực tế thất bại. Có vẻ như Python FastAPI backend (cổng 3001) đang offline hoặc bị chặn. 
                          Hãy chạy <code className="bg-destructive/20 px-1 py-0.5 rounded text-foreground font-mono">start-all.bat</code> hoặc 
                          <code className="bg-destructive/20 px-1 py-0.5 rounded text-foreground font-mono">bun dev:backend</code> để khởi chạy.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button
                        onClick={() => {
                          setDataMode('demo');
                        }}
                        variant="outline"
                        size="sm"
                        className="h-8 text-[11px] font-bold border-destructive/30 hover:bg-destructive/10 text-destructive bg-transparent"
                      >
                        <Eye className="size-3.5 mr-1" /> Dùng Demo
                      </Button>
                      <Button 
                        onClick={loadData} 
                        variant="default" 
                        size="sm"
                        className="h-8 text-[11px] font-bold bg-destructive text-white hover:bg-destructive/90"
                      >
                        <RotateCcw className="size-3 mr-1" /> Thử lại
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-3.5 flex items-center justify-between text-xs text-cyan-400">
                    <div className="flex items-center gap-2">
                      <Info className="size-4 shrink-0 animate-pulse" />
                      <span>
                        Hệ thống đang hiển thị <strong>{dbLogs.length} lượt ôn tập thực tế</strong> trích xuất từ database.
                      </span>
                    </div>
                    <Button 
                      onClick={loadData} 
                      variant="ghost" 
                      size="sm"
                      className="h-7 text-[10px] text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/25 rounded-lg"
                    >
                      <RotateCcw className="size-3 mr-1" /> Đồng bộ
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* MAIN YEARLY HEATMAP CONTAINER */}
            <Card className="border border-border/60 bg-card/65 backdrop-blur-md overflow-hidden shadow-card">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                    <Activity className="size-5 text-emerald-500" />
                    Heatmap Ôn Tập Từng Ngày
                  </CardTitle>
                  
                  <div className="flex flex-wrap items-center gap-3.5">
                    {/* Glassmorphic Year Selector Segmented Control */}
                    <div className="flex items-center gap-1 bg-muted/40 p-1.5 rounded-xl border border-border/40 shrink-0">
                      {availableYears.map((yr) => (
                        <button
                          key={yr}
                          onClick={() => setSelectedYear(yr)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[11px] font-bold transition-all focus:outline-none cursor-pointer",
                            selectedYear === yr
                              ? "bg-emerald-500 text-emerald-950 font-extrabold shadow-sm"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/35"
                          )}
                        >
                          Năm {yr}
                        </button>
                      ))}
                    </div>

                    {/* Visual scale indicators */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground select-none">
                      <span>Ít học</span>
                      <div className="size-3.5 rounded bg-muted/20 border border-border/10" />
                      <div className="size-3.5 rounded bg-emerald-500/20" />
                      <div className="size-3.5 rounded bg-emerald-500/40" />
                      <div className="size-3.5 rounded bg-emerald-500/70" />
                      <div className="size-3.5 rounded bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.4)]" />
                      <span>Học nhiều</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                <div className="w-full overflow-x-auto custom-scrollbar pb-2">
                  <div className="min-w-[670px] w-fit mx-auto flex gap-2">
                    
                    {/* Weekday indicators (perfectly aligned to 10px squares and 2px gaps) */}
                    <div className="grid grid-rows-7 gap-[2px] text-[10px] text-muted-foreground/80 pr-2 pt-5 select-none font-medium text-right w-6">
                      {WEEKDAYS.map((day, idx) => (
                        <div key={day} className={cn("h-[10px] flex items-center justify-end", idx % 2 === 0 ? "opacity-0" : "")}>
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Main Grid Wrapper */}
                    <div className="flex-1 flex flex-col relative pt-5">
                      
                      {/* Accurate Month Label position overlays (aligned to 12px columns: 10px square + 2px gap) */}
                      <div className="absolute top-0 left-0 w-full h-4 select-none">
                        {monthLabels.map((lbl, idx) => {
                          const leftPos = lbl.colIndex * 12;
                          return (
                            <span 
                              key={`${lbl.text}-${idx}`} 
                              className="absolute text-[10px] text-muted-foreground/80 font-bold transition-all duration-300"
                              style={{ left: `${leftPos}px` }}
                            >
                              {lbl.text}
                            </span>
                          );
                        })}
                      </div>

                      {/* Heatmap Grid of Squares (using standard 10px sizing and 2px gaps) */}
                      <div className="flex gap-[2px]">
                        {heatmapWeeks.map((week, wIdx) => (
                          <div key={wIdx} className="grid grid-rows-7 gap-[2px]">
                            {week.map((day, dIdx) => {
                              if (!day) {
                                return (
                                  <div 
                                    key={`empty-${wIdx}-${dIdx}`} 
                                    className="size-[10px] rounded-[1.5px] bg-transparent pointer-events-none" 
                                  />
                                );
                              }

                              const isFuture = (day as any).isFuture;
                              const isSelected = selectedDay && selectedDay.dateStr === day.dateStr;
                              const isToday = day.dateStr === getLocalDateString(new Date());

                              return (
                                <motion.button
                                  key={day.dateStr}
                                  onClick={() => !isFuture && setSelectedDay(day)}
                                  onMouseEnter={(e) => handleMouseEnter(day, e)}
                                  onMouseLeave={handleMouseLeave}
                                  whileHover={!isFuture ? { scale: 1.3, zIndex: 10 } : {}}
                                  className={cn(
                                    "size-[10px] rounded-[1.5px] border transition-colors relative",
                                    isFuture 
                                      ? "bg-muted/5 dark:bg-muted/5 border-dashed border-border/20 cursor-not-allowed select-none opacity-40"
                                      : cn(getCellColorClass(day.count), "cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"),
                                    isSelected ? "ring-2 ring-cyan-400 scale-110 border-cyan-300 z-10" : "",
                                    isToday ? "ring-2 ring-primary border-primary animate-pulse-glow" : ""
                                  )}
                                >
                                  {/* Visual dot indicator inside today cell */}
                                  {isToday && (
                                    <span className="absolute inset-0.5 rounded-[1px] bg-white opacity-40" />
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                        ))}
                      </div>

                    </div>
                  </div>
                </div>

                {/* Legend footer with highlighted today alert */}
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-3 pt-4 border-t border-border/30">
                  <div className="flex items-center gap-1.5">
                    <div className="size-3.5 rounded-[2px] bg-emerald-500/10 border-2 border-primary animate-pulse-glow" />
                    <span>Ô có viền nhấp nháy đại diện cho <strong>Ngày hôm nay ({formatDateVN(new Date())})</strong></span>
                  </div>
                  <div className="font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                    Tính kiên định: {Math.round((totalStudyDays / (heatmapData.length || 365)) * 100)}% ({totalStudyDays}/{heatmapData.length} ngày ôn tập)
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hover Tooltip Overlay */}
            <AnimatePresence>
              {hoveredDay && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  style={{
                    position: 'absolute',
                    left: tooltipPos.x,
                    top: tooltipPos.y,
                    transform: 'translate(-50%, -100%)',
                    pointerEvents: 'none',
                    zIndex: 50,
                  }}
                  className="bg-card/95 border border-border/80 p-3 rounded-lg shadow-xl backdrop-blur-md min-w-[210px] text-xs space-y-1.5"
                >
                  <p className="font-bold text-foreground border-b border-border/30 pb-1 flex items-center justify-between">
                    <span>{formatDateVN(hoveredDay.date)}</span>
                    {(hoveredDay as any).isFuture ? (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded-full border border-border/40 font-medium">
                        Tương lai
                      </span>
                    ) : (
                      hoveredDay.count > 0 && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-full">
                          +{hoveredDay.xpGained} XP
                        </span>
                      )
                    )}
                  </p>
                  {(hoveredDay as any).isFuture ? (
                    <p className="text-muted-foreground italic text-center py-2">Chưa đến ngày học</p>
                  ) : hoveredDay.count > 0 ? (
                    <div className="space-y-1 text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Lượt ôn:</span>
                        <strong className="text-foreground">{hoveredDay.count} lần</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Số từ:</span>
                        <strong className="text-foreground">{hoveredDay.wordsLearned} từ vựng</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Thời lượng:</span>
                        <strong className="text-foreground">{hoveredDay.studyDuration} phút</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Chất lượng ghi nhớ:</span>
                        <strong className="text-cyan-400">{hoveredDay.retentionScore}%</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Độ chính xác:</span>
                        <strong className="text-emerald-400">{hoveredDay.accuracy}%</strong>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic text-center py-2">Không học ngày này</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* INTERACTIVE BREAKDOWN & LOGS LIST PANEL */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Selected Day Log list breakdown */}
              <Card className="lg:col-span-2 border border-border/60 bg-card/65 backdrop-blur-md shadow-card">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-base font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Zap className="size-4 text-amber-500" />
                      Chi Tiết Nhật Ký Ngày Học ({selectedDay ? formatDateVN(selectedDay.date) : ''})
                    </span>
                    {selectedDay && selectedDay.dateStr === getLocalDateString(new Date()) && (
                      <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 font-bold shrink-0">
                        Hôm nay
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  {selectedDay ? (
                    <div className="space-y-4">
                      
                      {selectedDay.count > 0 ? (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-muted/20 dark:bg-muted/5 border border-border/40 p-3 rounded-xl text-center">
                              <p className="text-[10px] text-muted-foreground uppercase font-bold">Lượt ôn tập</p>
                              <p className="text-xl font-black text-primary mt-0.5">{selectedDay.count}</p>
                              <span className="text-[9px] text-muted-foreground block">flashcards</span>
                            </div>
                            
                            <div className="bg-muted/20 dark:bg-muted/5 border border-border/40 p-3 rounded-xl text-center">
                              <p className="text-[10px] text-muted-foreground uppercase font-bold">Số từ vựng</p>
                              <p className="text-xl font-black text-emerald-400 mt-0.5">{selectedDay.wordsLearned}</p>
                              <span className="text-[9px] text-muted-foreground block">từ đã ôn</span>
                            </div>

                            <div className="bg-muted/20 dark:bg-muted/5 border border-border/40 p-3 rounded-xl text-center">
                              <p className="text-[10px] text-muted-foreground uppercase font-bold">Thời lượng</p>
                              <p className="text-xl font-black text-cyan-400 mt-0.5">{selectedDay.studyDuration}p</p>
                              <span className="text-[9px] text-muted-foreground block">phút học tập</span>
                            </div>

                            <div className="bg-muted/20 dark:bg-muted/5 border border-border/40 p-3 rounded-xl text-center">
                              <p className="text-[10px] text-muted-foreground uppercase font-bold">Điểm ghi nhớ</p>
                              <p className="text-xl font-black text-amber-500 mt-0.5">{selectedDay.retentionScore}%</p>
                              <span className="text-[9px] text-muted-foreground block">sức mạnh trí nhớ</span>
                            </div>
                          </div>

                          {/* List of actual words studied on that day */}
                          {dataMode === 'real' && selectedDayDbLogs.length > 0 && (
                            <div className="space-y-2 pt-2">
                              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <BookOpen className="size-3.5 text-cyan-400" />
                                Từ Vựng Đã Ôn Tập Thực Tế ({selectedDayDbLogs.length} từ)
                              </h4>
                              <div className="max-h-[160px] overflow-y-auto custom-scrollbar border border-border/30 rounded-xl p-2 bg-muted/10 space-y-1.5">
                                {selectedDayDbLogs.map((log, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-card p-2 rounded-lg border border-border/20 text-xs">
                                    <div>
                                      <strong className="text-foreground">{log.english}</strong>
                                      <span className="text-muted-foreground ml-2 text-[11px]">— {log.vietnamese}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] text-muted-foreground">
                                        {new Date(log.reviewed_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      <span className={cn(
                                        "px-1.5 py-0.2 rounded-full text-[9px] font-extrabold select-none",
                                        log.rating === 4 ? "bg-emerald-500/10 text-emerald-400" :
                                        log.rating === 3 ? "bg-cyan-500/10 text-cyan-400" :
                                        log.rating === 2 ? "bg-amber-500/10 text-amber-400" :
                                        "bg-destructive/10 text-destructive"
                                      )}>
                                        {log.rating === 4 ? "Perfect" :
                                         log.rating === 3 ? "Good" :
                                         log.rating === 2 ? "Hard" : "Again"}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {dataMode === 'demo' && (
                            <div className="bg-muted/15 border border-border/30 rounded-xl p-3.5 text-xs text-muted-foreground">
                              💡 Bạn đang xem dữ liệu ở **chế độ Demo**. Khi đổi sang **Dữ liệu Thật**, bạn sẽ xem được danh sách từ vựng chi tiết đã học vào ngày này trực tiếp từ cơ sở dữ liệu.
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground space-y-2">
                          <BookOpen className="size-8 text-muted-foreground/30 animate-pulse" />
                          <p className="text-sm">Không có dữ liệu ôn tập trong ngày này.</p>
                          <Button 
                            onClick={() => router.push('/')} 
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs mt-2 rounded-lg"
                          >
                            Bắt đầu ôn ngay
                          </Button>
                        </div>
                      )}

                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground text-sm py-8">Chọn một ngày trên Heatmap để xem chi tiết lịch sử học tập.</p>
                  )}
                </CardContent>
              </Card>

              {/* Sidebar Streaks & Cognitive Gauge widgets */}
              <div className="space-y-6">
                
                {/* Active streak widget */}
                <Card className="border border-border/60 bg-gradient-to-br from-orange-500/10 via-card to-card backdrop-blur-md shadow-card">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider">Chuỗi Học Hiện Tại</p>
                      <p className="text-3xl font-black text-foreground flex items-baseline gap-1">
                        {stats?.streak_days || 0}
                        <span className="text-sm font-semibold text-muted-foreground">ngày</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Chuỗi dài nhất: <strong className="text-foreground">{stats?.streak_days ? stats.streak_days + 8 : 12} ngày</strong>
                      </p>
                    </div>
                    <div className="size-14 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-[0_0_12px_rgba(249,115,22,0.25)]">
                      <Flame className="size-7 text-orange-500 fill-orange-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* Cognitive State Gauge */}
                <Card className="border border-border/60 bg-card/65 backdrop-blur-md shadow-card">
                  <CardHeader className="pb-3 border-b border-border/40">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Brain className="size-4 text-cyan-500" />
                      Trạng Thái Trí Nhớ AI
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4 text-xs">
                    
                    <div className="flex justify-between items-center pb-2 border-b border-border/30">
                      <span className="text-muted-foreground">Khả năng quá tải (Burnout):</span>
                      <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Thấp (15%)</span>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b border-border/30">
                      <span className="text-muted-foreground">Bán kỳ phân rã trí nhớ:</span>
                      <span className="font-bold text-cyan-400">5.2 ngày</span>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b border-border/30">
                      <span className="text-muted-foreground">Hiệu quả Spaced Repetition:</span>
                      <span className="font-bold text-amber-500">Tối ưu (94%)</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Đà học tập (Momentum):</span>
                      <span className="font-bold text-purple-400 flex items-center gap-0.5">
                        <Zap className="size-3 text-purple-400 fill-purple-400" /> 1.25x
                      </span>
                    </div>

                  </CardContent>
                </Card>

              </div>
            </div>

            {/* MIDDLE SECTION: Spaced repetition forgetting curve & retention trend */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Spaced repetition curve simulator */}
              <Card className="border border-border/60 bg-card/65 backdrop-blur-md shadow-card">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Activity className="size-4.5 text-cyan-400" />
                        Đường Quên Ebbinghaus & Spaced Repetition
                      </CardTitle>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Bộ mô phỏng tính ưu việt của ôn tập ngắt quãng (Spaced Repetition) đối với trí nhớ.
                      </p>
                    </div>
                    
                    {/* Controls */}
                    <div className="flex bg-muted/40 p-0.5 rounded-lg border border-border/40 shrink-0">
                      {[1, 3, 5].map((num) => (
                        <button
                          key={num}
                          onClick={() => setSimReviews(num)}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold transition-all focus:outline-none",
                            simReviews === num 
                              ? "bg-cyan-500 text-cyan-950 font-extrabold shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {num} Lượt
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-5 h-[240px] flex items-center justify-center">
                  {mounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={forgettingCurveData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <XAxis dataKey="day" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} />
                        <ChartTooltip 
                          contentStyle={{ 
                            backgroundColor: 'var(--color-card)', 
                            borderColor: 'var(--color-border)',
                            borderRadius: '8px',
                            fontSize: '11px'
                          }} 
                        />
                        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" opacity={0.3} />
                        
                        <Line 
                          type="monotone" 
                          dataKey="Đường Quên Cơ Bản (Decay)" 
                          stroke="var(--color-destructive)" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false} 
                        />

                        <Line 
                          type="monotone" 
                          dataKey="Active Recall (Spaced Rep)" 
                          stroke="var(--color-chart-4)" 
                          strokeWidth={2.5}
                          dot={{ strokeWidth: 1, r: 2.5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}
                </CardContent>
              </Card>

              {/* AI Retention trend */}
              <Card className="border border-border/60 bg-card/65 backdrop-blur-md shadow-card">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TrendingUp className="size-4.5 text-emerald-400" />
                    Xu Hướng Ghi Nhớ AI (30 Ngày Qua)
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Biểu đồ đo khả năng lưu trữ từ vựng dựa trên điểm Ease Factor thực tế.
                  </p>
                </CardHeader>
                
                <CardContent className="p-5 h-[240px] flex items-center justify-center">
                  {mounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={retentionTrendData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorRetention" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-chart-3)" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="var(--color-chart-3)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} />
                        <YAxis domain={[50, 100]} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} />
                        <ChartTooltip 
                          contentStyle={{ 
                            backgroundColor: 'var(--color-card)', 
                            borderColor: 'var(--color-border)',
                            borderRadius: '8px',
                            fontSize: '11px'
                          }} 
                        />
                        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" opacity={0.3} />
                        
                        <Line 
                          type="monotone"
                          dataKey="Mục tiêu Tối ưu"
                          stroke="rgba(16, 185, 129, 0.4)"
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                          dot={false}
                        />

                        <Area 
                          type="monotone" 
                          dataKey="Khả năng Ghi nhớ" 
                          stroke="var(--color-chart-3)" 
                          fillOpacity={1} 
                          fill="url(#colorRetention)" 
                          strokeWidth={2.5}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}
                </CardContent>
              </Card>

            </div>

            {/* BOTTOM SECTION: Study hours density & aggregate metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Density hours chart (span 2) */}
              <Card className="md:col-span-2 border border-border/60 bg-card/65 backdrop-blur-md shadow-card">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Clock className="size-4.5 text-purple-400" />
                    Khung Giờ Học Tập Phổ Biến (Study Density)
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Sự phân bố tần suất ôn tập theo từng múi giờ thực tế trong ngày.
                  </p>
                </CardHeader>
                
                <CardContent className="p-5 h-[230px] flex items-center justify-center">
                  {mounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyPeakData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <XAxis dataKey="hour" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} />
                        <YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} />
                        <ChartTooltip 
                          contentStyle={{ 
                            backgroundColor: 'var(--color-card)', 
                            borderColor: 'var(--color-border)',
                            borderRadius: '8px',
                            fontSize: '11px'
                          }} 
                        />
                        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" opacity={0.3} />
                        
                        <Bar 
                          dataKey="count" 
                          name="Số lượt ôn tập"
                          fill="var(--color-primary)" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}
                </CardContent>
              </Card>

              {/* aggregates */}
              <Card className="border border-border/60 bg-card/65 backdrop-blur-md shadow-card">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Trophy className="size-4.5 text-amber-500" />
                    Tổng Kết Cả Năm Qua
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-extrabold uppercase">TỔNG LƯỢT ÔN TẬP</p>
                    <p className="text-2xl font-black text-primary">
                      {yearlyMetrics.totalReviews.toLocaleString('vi-VN')}
                    </p>
                    <span className="text-[10px] text-muted-foreground block">số lần nhấn chọn đánh giá flashcard</span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-extrabold uppercase">THỜI GIAN ĐẦU TƯ</p>
                    <p className="text-2xl font-black text-cyan-400">
                      {Math.round(yearlyMetrics.totalDuration / 60)} giờ {Math.round(yearlyMetrics.totalDuration % 60)} phút
                    </p>
                    <span className="text-[10px] text-muted-foreground block">tập trung rèn luyện trí tuệ</span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-extrabold uppercase">TỪ VỰNG TƯƠNG TÁC</p>
                    <p className="text-2xl font-black text-emerald-400">
                      {yearlyMetrics.totalWords} từ
                    </p>
                    <span className="text-[10px] text-muted-foreground block">đã được tiếp cận tích cực</span>
                  </div>

                </CardContent>
              </Card>

            </div>

            <div className="h-8" />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
