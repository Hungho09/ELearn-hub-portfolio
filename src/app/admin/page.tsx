'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Menu,
  Shield,
  Download,
  Loader2,
  Plus,
  Search,
  Trash2,
  BookOpen,
  BarChart3,
  Database,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  Languages,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/home/Sidebar';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────

interface VocabStats {
  total_vocabulary: number;
  by_difficulty: Record<string, number>;
  by_category: Record<string, number>;
  by_part_of_speech: Record<string, number>;
}

interface VocabItem {
  id: number;
  english: string;
  vietnamese: string;
  pronunciation?: string;
  example_english?: string;
  example_vietnamese?: string;
  part_of_speech?: string;
  difficulty_level?: number;
  category?: string;
}

interface AddVocabForm {
  english: string;
  vietnamese: string;
  pronunciation: string;
  example_english: string;
  example_vietnamese: string;
  part_of_speech: string;
  difficulty_level: string;
  category: string;
}

const EMPTY_FORM: AddVocabForm = {
  english: '',
  vietnamese: '',
  pronunciation: '',
  example_english: '',
  example_vietnamese: '',
  part_of_speech: 'noun',
  difficulty_level: '1',
  category: '',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  '1': 'Cơ bản',
  '2': 'Trung bình',
  '3': 'Nâng cao',
};

const PART_OF_SPEECH_LABELS: Record<string, string> = {
  noun: 'Danh từ',
  verb: 'Động từ',
  adjective: 'Tính từ',
  adverb: 'Trạng từ',
};

// ─── Main Component ──────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Stats
  const [stats, setStats] = useState<VocabStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Enrich
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<string | null>(null);
  const [enrichCount, setEnrichCount] = useState('50');

  // Add form
  const [form, setForm] = useState<AddVocabForm>(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState<string | null>(null);

  // Vocabulary list
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [vocabLoading, setVocabLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const skipRef = useRef(0);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

  // ─── Auth check ──────────────────────────────────────────
  const isAdmin = session?.user?.role === 'admin';

  // ─── Load stats ──────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await fetch('/api/vocabulary/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ─── Load vocabulary list ────────────────────────────────
  const loadVocab = useCallback(async (search: string, resetList = true) => {
    try {
      setVocabLoading(true);
      const currentSkip = resetList ? 0 : skipRef.current;
      const params = new URLSearchParams({
        limit: '50',
        skip: String(currentSkip),
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/vocabulary/admin/list?${params}`);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.items || data.vocabulary || [];
        if (resetList) {
          setVocabList(items);
        } else {
          setVocabList(prev => [...prev, ...items]);
        }
        setHasMore(items.length >= 50);
        skipRef.current = currentSkip + items.length;
      }
    } catch (err) {
      console.error('Failed to load vocab:', err);
    } finally {
      setVocabLoading(false);
    }
  }, []);

  // ─── Initial load ────────────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return;
    if (!isAdmin) return;
    loadStats();
    loadVocab('');
  }, [status, isAdmin, loadStats, loadVocab]);

  // ─── Debounced search ────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!isAdmin) return;
    loadVocab(searchDebounced, true);
  }, [searchDebounced, isAdmin, loadVocab]);

  // ─── Enrich handler ──────────────────────────────────────
  const handleEnrich = async () => {
    setEnriching(true);
    setEnrichResult(null);
    try {
      const res = await fetch(`/api/vocabulary/admin/enrich?count=${enrichCount}`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }));
        setEnrichResult(`Lỗi: ${data.error || 'Không thể thêm từ vựng'}`);
        return;
      }
      const data = await res.json();
      const added = data.added || data.added_count || 0;
      const skipped = data.skipped || 0;
      const errors = data.errors || 0;
      const total = data.total_in_db || data.total || 0;
      setEnrichResult(
        `Đã thêm ${added} từ mới! Bỏ qua ${skipped}, lỗi ${errors}. Tổng: ${total} từ`
      );
      loadStats();
      loadVocab(searchDebounced, true);
    } catch {
      setEnrichResult('Lỗi kết nối đến server. Hãy thử lại.');
    } finally {
      setEnriching(false);
    }
  };

  // ─── Add single vocab handler ────────────────────────────
  const handleAddVocab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.english.trim() || !form.vietnamese.trim()) return;

    setAdding(true);
    setAddResult(null);
    try {
      const body = {
        english: form.english.trim(),
        vietnamese: form.vietnamese.trim(),
        pronunciation: form.pronunciation.trim() || undefined,
        example_english: form.example_english.trim() || undefined,
        example_vietnamese: form.example_vietnamese.trim() || undefined,
        part_of_speech: form.part_of_speech,
        difficulty_level: parseInt(form.difficulty_level),
        category: form.category.trim() || undefined,
      };

      const res = await fetch('/api/vocabulary/admin/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }));
        setAddResult(`Lỗi: ${data.error || 'Không thể thêm từ vựng'}`);
        return;
      }

      setAddResult('Đã thêm từ vựng thành công!');
      setForm(EMPTY_FORM);
      loadStats();
      loadVocab(searchDebounced, true);
    } catch {
      setAddResult('Lỗi kết nối đến server. Hãy thử lại.');
    } finally {
      setAdding(false);
    }
  };

  // ─── Delete handler ──────────────────────────────────────
  const handleDelete = async (id: number) => {
    setDeletingIds(prev => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/vocabulary/admin/delete/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setVocabList(prev => prev.filter(item => item.id !== id));
        loadStats();
      } else {
        const data = await res.json().catch(() => ({ error: 'Delete failed' }));
        console.error('Delete failed:', data.error);
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // ─── Load more handler ──────────────────────────────────
  const handleLoadMore = () => {
    loadVocab(searchDebounced, false);
  };

  // ─── Loading / Unauthenticated states ────────────────────
  if (status === 'loading') {
    return (
      <TooltipProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <div className="hidden md:block shrink-0">
            <Sidebar collapsed={false} />
          </div>
          <main className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="size-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-muted-foreground">Đang tải...</p>
            </div>
          </main>
        </div>
      </TooltipProvider>
    );
  }

  if (!session || !isAdmin) {
    return (
      <TooltipProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <div className="hidden md:block shrink-0">
            <Sidebar collapsed={false} />
          </div>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetContent side="left" className="p-0 w-[260px]">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <Sidebar collapsed={false} onNavigate={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>
          <main className="flex-1 flex items-center justify-center p-5">
            <div className="flex flex-col items-center gap-4 text-center max-w-md">
              <div className="size-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="size-10 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Truy cập bị từ chối</h1>
              <p className="text-muted-foreground">
                Bạn cần đăng nhập bằng tài khoản Admin để truy cập trang này.
              </p>
              {!session ? (
                <Button onClick={() => router.push('/login')} className="gap-2">
                  Đăng nhập
                </Button>
              ) : (
                <Button onClick={() => router.push('/')} className="gap-2">
                  Về trang chủ
                </Button>
              )}
            </div>
          </main>
        </div>
      </TooltipProvider>
    );
  }

  // ─── Main Render ─────────────────────────────────────────
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
          <div className="mx-auto max-w-6xl p-5 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mt-4 md:mt-0">
              <div className="flex items-center justify-between">
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
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                      <Shield className="size-7 text-primary" />
                      Admin Dashboard
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      Quản lý từ vựng và dữ liệu hệ thống
                    </p>
                  </div>
                </div>
                <Badge className="hidden sm:flex bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 text-xs">
                  <Shield className="size-3 mr-1" />
                  Admin
                </Badge>
              </div>
            </div>

            {/* ═══ Section 1: Dashboard Stats ═══ */}
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="size-5 text-primary" />
                Thống kê từ vựng
              </h2>

              {statsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="h-16 animate-pulse bg-muted rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : stats ? (
                <>
                  {/* Top stats cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Card className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Database className="size-4 text-primary" />
                          <span className="text-xs text-muted-foreground">Tổng từ vựng</span>
                        </div>
                        <p className="text-2xl font-bold text-primary">
                          {stats.total_vocabulary || 0}
                        </p>
                        <p className="text-[10px] text-muted-foreground">từ trong hệ thống</p>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-emerald-500">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <BookOpen className="size-4 text-emerald-500" />
                          <span className="text-xs text-muted-foreground">Cơ bản</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-600">
                          {stats.by_difficulty?.['1'] || stats.by_difficulty?.[1] || 0}
                        </p>
                        <p className="text-[10px] text-muted-foreground">từ mức 1</p>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-amber-500">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Languages className="size-4 text-amber-500" />
                          <span className="text-xs text-muted-foreground">Trung bình</span>
                        </div>
                        <p className="text-2xl font-bold text-amber-600">
                          {stats.by_difficulty?.['2'] || stats.by_difficulty?.[2] || 0}
                        </p>
                        <p className="text-[10px] text-muted-foreground">từ mức 2</p>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-rose-500">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <GraduationCap className="size-4 text-rose-500" />
                          <span className="text-xs text-muted-foreground">Nâng cao</span>
                        </div>
                        <p className="text-2xl font-bold text-rose-600">
                          {stats.by_difficulty?.['3'] || stats.by_difficulty?.[3] || 0}
                        </p>
                        <p className="text-[10px] text-muted-foreground">từ mức 3</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Category and Part of Speech breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <Card>
                      <CardHeader className="pb-3 pt-4 px-4">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <BookOpen className="size-4 text-primary" />
                          Theo chủ đề
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 pt-0">
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                          {stats.by_category && Object.keys(stats.by_category).length > 0 ? (
                            Object.entries(stats.by_category)
                              .sort(([, a], [, b]) => (b as number) - (a as number))
                              .map(([cat, count]) => (
                                <div key={cat} className="flex items-center justify-between">
                                  <span className="text-sm text-foreground capitalize">{cat}</span>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {count as number}
                                  </Badge>
                                </div>
                              ))
                          ) : (
                            <p className="text-xs text-muted-foreground">Chưa có dữ liệu</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3 pt-4 px-4">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Languages className="size-4 text-primary" />
                          Theo từ loại
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 pt-0">
                        <div className="space-y-2">
                          {stats.by_part_of_speech && Object.keys(stats.by_part_of_speech).length > 0 ? (
                            Object.entries(stats.by_part_of_speech)
                              .sort(([, a], [, b]) => (b as number) - (a as number))
                              .map(([pos, count]) => (
                                <div key={pos} className="flex items-center justify-between">
                                  <span className="text-sm text-foreground">
                                    {PART_OF_SPEECH_LABELS[pos] || pos}
                                  </span>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {count as number}
                                  </Badge>
                                </div>
                              ))
                          ) : (
                            <p className="text-xs text-muted-foreground">Chưa có dữ liệu</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">Không thể tải thống kê</p>
                    <Button variant="outline" size="sm" onClick={loadStats} className="mt-2 gap-2">
                      <RefreshCw className="size-3" /> Thử lại
                    </Button>
                  </CardContent>
                </Card>
              )}
            </section>

            <Separator className="my-8" />

            {/* ═══ Section 2: Add Vocabulary from API ═══ */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Download className="size-5 text-primary" />
                Thêm từ vựng từ API
              </h2>

              <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Lấy từ vựng từ nguồn bên ngoài
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Thêm tự động từ Free Dictionary API + MyMemory Translation.
                        Hiện có <span className="font-semibold text-primary">{stats?.total_vocabulary || 0}</span> từ.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={enrichCount} onValueChange={setEnrichCount}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="50">50 từ</SelectItem>
                          <SelectItem value="100">100 từ</SelectItem>
                          <SelectItem value="200">200 từ</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleEnrich}
                        disabled={enriching}
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
                            Thêm từ
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  {enrichResult && (
                    <p className={cn(
                      'mt-3 text-sm rounded-lg p-3',
                      enrichResult.startsWith('Lỗi')
                        ? 'text-destructive bg-destructive/10'
                        : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/20'
                    )}>
                      {enrichResult}
                    </p>
                  )}
                </CardContent>
              </Card>
            </section>

            <Separator className="my-8" />

            {/* ═══ Section 3: Add Single Vocabulary ═══ */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Plus className="size-5 text-primary" />
                Thêm từ vựng mới
              </h2>

              <Card>
                <CardContent className="p-5">
                  <form onSubmit={handleAddVocab} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* English */}
                      <div className="space-y-2">
                        <Label htmlFor="english" className="text-sm font-medium">
                          Tiếng Anh <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="english"
                          placeholder="Ví dụ: hello"
                          value={form.english}
                          onChange={(e) => setForm(prev => ({ ...prev, english: e.target.value }))}
                          required
                        />
                      </div>

                      {/* Vietnamese */}
                      <div className="space-y-2">
                        <Label htmlFor="vietnamese" className="text-sm font-medium">
                          Tiếng Việt <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="vietnamese"
                          placeholder="Ví dụ: xin chào"
                          value={form.vietnamese}
                          onChange={(e) => setForm(prev => ({ ...prev, vietnamese: e.target.value }))}
                          required
                        />
                      </div>

                      {/* Pronunciation */}
                      <div className="space-y-2">
                        <Label htmlFor="pronunciation" className="text-sm font-medium">
                          Phát âm
                        </Label>
                        <Input
                          id="pronunciation"
                          placeholder="Ví dụ: /həˈloʊ/"
                          value={form.pronunciation}
                          onChange={(e) => setForm(prev => ({ ...prev, pronunciation: e.target.value }))}
                        />
                      </div>

                      {/* Category */}
                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-sm font-medium">
                          Chủ đề
                        </Label>
                        <Input
                          id="category"
                          placeholder="Ví dụ: greeting"
                          value={form.category}
                          onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                        />
                      </div>

                      {/* Part of Speech */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Từ loại</Label>
                        <Select
                          value={form.part_of_speech}
                          onValueChange={(val) => setForm(prev => ({ ...prev, part_of_speech: val }))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="noun">Danh từ (noun)</SelectItem>
                            <SelectItem value="verb">Động từ (verb)</SelectItem>
                            <SelectItem value="adjective">Tính từ (adjective)</SelectItem>
                            <SelectItem value="adverb">Trạng từ (adverb)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Difficulty Level */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Mức độ</Label>
                        <Select
                          value={form.difficulty_level}
                          onValueChange={(val) => setForm(prev => ({ ...prev, difficulty_level: val }))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 - Cơ bản</SelectItem>
                            <SelectItem value="2">2 - Trung bình</SelectItem>
                            <SelectItem value="3">3 - Nâng cao</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Example sentences */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="example_english" className="text-sm font-medium">
                          Ví dụ (Anh)
                        </Label>
                        <Input
                          id="example_english"
                          placeholder="Ví dụ: Hello, how are you?"
                          value={form.example_english}
                          onChange={(e) => setForm(prev => ({ ...prev, example_english: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="example_vietnamese" className="text-sm font-medium">
                          Ví dụ (Việt)
                        </Label>
                        <Input
                          id="example_vietnamese"
                          placeholder="Ví dụ: Xin chào, bạn khỏe không?"
                          value={form.example_vietnamese}
                          onChange={(e) => setForm(prev => ({ ...prev, example_vietnamese: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button type="submit" disabled={adding} className="gap-2">
                        {adding ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Đang thêm...
                          </>
                        ) : (
                          <>
                            <Plus className="size-4" />
                            Thêm từ vựng
                          </>
                        )}
                      </Button>
                      {addResult && (
                        <p className={cn(
                          'text-sm',
                          addResult.startsWith('Lỗi')
                            ? 'text-destructive'
                            : 'text-emerald-600 dark:text-emerald-400'
                        )}>
                          {addResult}
                        </p>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </section>

            <Separator className="my-8" />

            {/* ═══ Section 4: Browse & Manage Vocabulary ═══ */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="size-5 text-primary" />
                Quản lý từ vựng
              </h2>

              {/* Search bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm từ vựng..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Vocabulary table */}
              <Card>
                <CardContent className="p-0">
                  {/* Table header */}
                  <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_0.7fr_0.6fr_0.6fr_60px] gap-2 px-4 py-3 border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Tiếng Anh</span>
                    <span>Tiếng Việt</span>
                    <span>Chủ đề</span>
                    <span>Mức</span>
                    <span>Từ loại</span>
                    <span></span>
                  </div>

                  {/* Mobile header */}
                  <div className="sm:hidden px-4 py-2 border-b bg-muted/30 text-xs font-semibold text-muted-foreground">
                    Danh sách từ vựng
                  </div>

                  {/* Table body */}
                  {vocabLoading && vocabList.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="size-8 animate-spin rounded-full border-3 border-primary border-t-transparent mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Đang tải từ vựng...</p>
                    </div>
                  ) : vocabList.length === 0 ? (
                    <div className="p-8 text-center">
                      <BookOpen className="size-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? 'Không tìm thấy từ vựng phù hợp' : 'Chưa có từ vựng nào'}
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                      {vocabList.map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_0.7fr_0.6fr_0.6fr_60px] gap-1 sm:gap-2 px-4 py-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                        >
                          {/* Desktop layout */}
                          <span className="hidden sm:block text-sm font-medium text-foreground truncate">
                            {item.english}
                          </span>
                          <span className="hidden sm:block text-sm text-foreground truncate">
                            {item.vietnamese}
                          </span>
                          <span className="hidden sm:block text-sm text-muted-foreground truncate capitalize">
                            {item.category || '-'}
                          </span>
                          <span className="hidden sm:block">
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-[10px]',
                                item.difficulty_level === 1
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : item.difficulty_level === 2
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                              )}
                            >
                              {item.difficulty_level || '-'} - {DIFFICULTY_LABELS[String(item.difficulty_level)] || ''}
                            </Badge>
                          </span>
                          <span className="hidden sm:block text-sm text-muted-foreground">
                            {PART_OF_SPEECH_LABELS[item.part_of_speech || ''] || item.part_of_speech || '-'}
                          </span>
                          <div className="hidden sm:flex justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingIds.has(item.id)}
                            >
                              {deletingIds.has(item.id) ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </Button>
                          </div>

                          {/* Mobile layout */}
                          <div className="sm:hidden flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground truncate">
                                  {item.english}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    'text-[9px] shrink-0',
                                    item.difficulty_level === 1
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                      : item.difficulty_level === 2
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                                  )}
                                >
                                  Lv.{item.difficulty_level || '-'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {item.vietnamese}
                                {item.category && <span className="ml-2 capitalize">· {item.category}</span>}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingIds.has(item.id)}
                            >
                              {deletingIds.has(item.id) ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Load more */}
                  {hasMore && vocabList.length > 0 && (
                    <div className="p-3 border-t text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadMore}
                        disabled={vocabLoading}
                        className="gap-2"
                      >
                        {vocabLoading ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <ChevronRight className="size-3" />
                        )}
                        Tải thêm
                      </Button>
                    </div>
                  )}

                  {/* Result count */}
                  {vocabList.length > 0 && (
                    <div className="px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground text-center">
                      Hiển thị {vocabList.length} từ vựng
                      {searchQuery && ` cho "${searchQuery}"`}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <div className="h-8" />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
