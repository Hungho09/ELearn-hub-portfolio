'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sparkles, RotateCcw, ArrowLeft, Flame, BarChart3 } from 'lucide-react';

interface SessionStats {
  correct: number;
  wrong: number;
  close: number;
  total: number;
}

interface UserStats {
  total_reviews: number;
  words_mastered: number;
  words_learning: number;
  words_new: number;
  streak_days: number;
}

interface SessionCompleteProps {
  sessionStats: SessionStats;
  userStats: UserStats | null;
  onRestart: () => void;
  onBack: () => void;
}

export function SessionComplete({
  sessionStats,
  userStats,
  onRestart,
  onBack,
}: SessionCompleteProps) {
  const accuracyPercent = sessionStats.total > 0
    ? Math.round(((sessionStats.correct + sessionStats.close) / sessionStats.total) * 100)
    : 0;

  return (
    <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
      {/* Celebration icon */}
      <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center">
        <Sparkles className="size-10 text-primary" />
      </div>

      {/* Title */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground">Hoàn thành buổi học!</h2>
        <p className="text-muted-foreground mt-2">Tuyệt vời, bạn đã hoàn thành bài ôn tập từ vựng!</p>
      </div>

      {/* Session Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-lg">
        <Card className="text-center shadow-card">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">{sessionStats.total}</p>
            <p className="text-xs text-muted-foreground">Đã ôn</p>
          </CardContent>
        </Card>
        <Card className="text-center border-l-4 border-l-emerald-500 shadow-card">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-emerald-600">{sessionStats.correct}</p>
            <p className="text-xs text-muted-foreground">Chính xác</p>
          </CardContent>
        </Card>
        <Card className="text-center border-l-4 border-l-amber-500 shadow-card">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-600">{sessionStats.close}</p>
            <p className="text-xs text-muted-foreground">Gần đúng</p>
          </CardContent>
        </Card>
        <Card className="text-center border-l-4 border-l-red-500 shadow-card">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-red-500">{sessionStats.wrong}</p>
            <p className="text-xs text-muted-foreground">Cần ôn lại</p>
          </CardContent>
        </Card>
      </div>

      {/* Accuracy */}
      {sessionStats.total > 0 && (
        <div className="w-full max-w-lg">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Độ chính xác</span>
            <span className="font-semibold">{accuracyPercent}%</span>
          </div>
          <Progress
            value={accuracyPercent}
            className="h-3"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Bao gồm câu trả lời chính xác và gần đúng
          </p>
        </div>
      )}

      {/* Overall Stats */}
      {userStats && (
        <Card className="w-full max-w-lg">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              Tiến độ tổng quan
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Từ đã thành thạo</span>
                <span className="font-semibold text-primary">{userStats.words_mastered}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Đang học</span>
                <span className="font-semibold text-emerald-600">{userStats.words_learning}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chưa học</span>
                <span className="font-semibold text-amber-600">{userStats.words_new}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chuỗi ngày</span>
                <span className="font-semibold text-orange-500 flex items-center gap-1">
                  <Flame className="size-3" /> {userStats.streak_days} ngày
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tổng lần ôn</span>
                <span className="font-semibold">{userStats.total_reviews}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button onClick={onRestart} size="lg" className="gap-2">
          <RotateCcw className="size-4" />
          Học tiếp
        </Button>
        <Button variant="outline" onClick={onBack} size="lg" className="gap-2">
          <ArrowLeft className="size-4" />
          Về trang chủ
        </Button>
      </div>
    </div>
  );
}
