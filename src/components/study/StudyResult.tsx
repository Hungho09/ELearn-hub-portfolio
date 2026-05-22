'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, Volume2, Brain } from 'lucide-react';
import { US, VN} from 'country-flag-icons/react/3x2'
import { cn } from '@/lib/utils';

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

interface StudyResultProps {
  result: CheckAnswerResult;
  submitting: boolean;
  onContinue: () => void;
}

const MATCH_CONFIG = {
  exact: {
    icon: CheckCircle2,
    label: 'Chính xác!',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/5 dark:bg-emerald-950/20',
    borderColor: 'border-emerald-500/30 dark:border-emerald-500/20',
    badgeBg: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
    detailLabel: 'Perfect match',
    shadowClass: 'shadow-[0_0_25px_rgba(16,185,129,0.15)] dark:shadow-[0_0_30px_rgba(16,185,129,0.1)]',
  },
  semantic: {
    icon: CheckCircle2,
    label: 'Chính xác!',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/5 dark:bg-emerald-950/20',
    borderColor: 'border-emerald-500/30 dark:border-emerald-500/20',
    badgeBg: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
    detailLabel: 'Semantic match (AI)',
    shadowClass: 'shadow-[0_0_25px_rgba(16,185,129,0.15)] dark:shadow-[0_0_30px_rgba(16,185,129,0.1)]',
  },
  close: {
    icon: AlertTriangle,
    label: 'Gần đúng!',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/5 dark:bg-amber-950/20',
    borderColor: 'border-amber-500/30 dark:border-amber-500/20',
    badgeBg: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    detailLabel: 'Minor differences',
    shadowClass: 'shadow-[0_0_25px_rgba(245,158,11,0.15)] dark:shadow-[0_0_30px_rgba(245,158,11,0.1)]',
  },
  partial: {
    icon: AlertTriangle,
    label: 'Một phần đúng',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/5 dark:bg-orange-950/20',
    borderColor: 'border-orange-500/30 dark:border-orange-500/20',
    badgeBg: 'bg-orange-500/10 text-orange-500 border border-orange-500/20',
    detailLabel: 'Partially correct',
    shadowClass: 'shadow-[0_0_25px_rgba(249,115,22,0.15)] dark:shadow-[0_0_30px_rgba(249,115,22,0.1)]',
  },
  incorrect: {
    icon: XCircle,
    label: 'Chưa đúng',
    color: 'text-red-500',
    bgColor: 'bg-red-500/5 dark:bg-red-950/20',
    borderColor: 'border-red-500/30 dark:border-red-500/20',
    badgeBg: 'bg-red-500/10 text-red-500 border border-red-500/20',
    detailLabel: 'Not correct',
    shadowClass: 'shadow-[0_0_25px_rgba(239,68,68,0.15)] dark:shadow-[0_0_30px_rgba(239,68,68,0.1)]',
  },
};

const GRADER_LABELS = {
  comet: { label: 'COMET AI', icon: Brain, color: 'text-violet-500 dark:text-violet-400 border border-violet-500/20 bg-violet-500/10' },
  levenshtein: { label: 'Levenshtein', icon: AlertTriangle, color: 'text-muted-foreground' },
  exact: { label: 'Exact', icon: CheckCircle2, color: 'text-emerald-500 dark:text-emerald-400' },
};

export function StudyResult({ result, submitting, onContinue }: StudyResultProps) {
  const matchType = result.match_type === 'semantic' && !result.is_correct
    ? (result.similarity >= 0.5 ? 'partial' : 'incorrect')
    : result.match_type;
  const config = MATCH_CONFIG[matchType as keyof typeof MATCH_CONFIG] || MATCH_CONFIG.incorrect;
  const Icon = config.icon;

  const graderInfo = GRADER_LABELS[result.grader] || GRADER_LABELS.levenshtein;
  const GraderIcon = graderInfo.icon;

  return (
    <div className="space-y-4">
      <Card variant="glass" className={cn('relative overflow-hidden backdrop-blur-2xl transition-all duration-500 group', config.bgColor, config.borderColor, config.shadowClass)}>
        {/* Light-catch edge overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none group-hover:via-white/10 group-hover:to-white/20 transition-all duration-500" />
        
        <CardContent className="relative p-6 md:p-8">
          <div className="flex flex-col items-center gap-5 animate-in fade-in slide-in-from-bottom-4 duration-400">
            {/* Result icon & label */}
            <div className={cn('flex items-center gap-2 text-xl font-extrabold tracking-wide uppercase', config.color)}>
              <Icon className="size-6 animate-pulse" />
              {config.label}
            </div>

            {/* Accuracy badge + Grader badge */}
            <div className="flex items-center gap-3">
              <Badge className={cn('text-sm px-3 py-1 font-semibold', config.badgeBg)}>
                {Math.round(result.accuracy)}% accuracy
              </Badge>
              <Badge variant="outline" className="text-xs border-white/20 dark:border-white/10">
                {config.detailLabel}
              </Badge>
              {result.grader === 'comet' && (
                <Badge variant="outline" className={cn('text-xs gap-1 py-1 px-2.5 font-medium', graderInfo.color)}>
                  <GraderIcon className="size-3" />
                  {graderInfo.label}
                </Badge>
              )}
            </div>

            {/* Your answer vs correct answer */}
            <div className="w-full max-w-md space-y-3">
              {/* User's answer */}
              <div className={cn(
                'rounded-xl p-4 border transition-colors duration-300',
                result.is_correct
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-red-500/5 border-red-500/20'
              )}>
                <p className="text-xs text-muted-foreground mb-1 font-medium">Câu trả lời của bạn</p>
                <p className={cn(
                  'text-lg font-extrabold tracking-tight',
                  result.is_correct ? 'text-emerald-500' : 'text-red-500'
                )}>
                  {result.user_answer}
                </p>
              </div>

              {/* Correct answer */}
              <div className="rounded-xl p-4 border bg-primary/5 border-primary/20 backdrop-blur-md">
                <p className="text-xs text-muted-foreground mb-1 font-medium">Đáp án đúng</p>
                <p className="text-lg font-black text-foreground tracking-tight">{result.correct_answer}</p>
                {result.pronunciation && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1 font-medium">
                    <Volume2 className="size-3.5 text-primary" />/{result.pronunciation}/
                  </p>
                )}
              </div>
            </div>

            {/* Example sentence */}
            {result.example_english && (
              <div className="w-full max-w-md rounded-xl bg-white/5 dark:bg-black/20 p-4 border border-white/10 dark:border-white/5 backdrop-blur-md">
                <p className="text-sm text-foreground flex items-center gap-1.5 font-medium leading-relaxed"><US title="United States" className="size-3.5 shrink-0 rounded-sm" /> {result.example_english}</p>
                <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5 leading-relaxed"><VN title="Vietnam" className="size-3.5 shrink-0 rounded-sm" /> {result.example_vietnamese}</p>
              </div>
            )}

            {/* Continue button */}
            <Button
              onClick={onContinue}
              disabled={submitting}
              className="w-full max-w-md h-12 text-base font-semibold rounded-xl gap-2 shadow-lg hover:shadow-xl transition-all duration-300"
              size="lg"
            >
              {submitting ? (
                <div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  Tiếp tục
                  <ArrowRight className="size-4" />
                  <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[11px]">↵</kbd>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
