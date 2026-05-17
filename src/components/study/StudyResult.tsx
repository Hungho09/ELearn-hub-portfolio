'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, Volume2, Brain, Globe } from 'lucide-react';
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
  grader: 'labse' | 'levenshtein' | 'exact';
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
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    detailLabel: 'Perfect match',
  },
  semantic: {
    icon: CheckCircle2,
    label: 'Chính xác!',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    detailLabel: 'Semantic match (AI)',
  },
  close: {
    icon: AlertTriangle,
    label: 'Gần đúng!',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-300 dark:border-amber-700',
    badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    detailLabel: 'Minor differences',
  },
  partial: {
    icon: AlertTriangle,
    label: 'Một phần đúng',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-300 dark:border-orange-700',
    badgeBg: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    detailLabel: 'Partially correct',
  },
  incorrect: {
    icon: XCircle,
    label: 'Chưa đúng',
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-300 dark:border-red-700',
    badgeBg: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    detailLabel: 'Not correct',
  },
};

const GRADER_LABELS = {
  labse: { label: 'LaBSE AI', icon: Brain, color: 'text-violet-600 dark:text-violet-400' },
  levenshtein: { label: 'Levenshtein', icon: AlertTriangle, color: 'text-muted-foreground' },
  exact: { label: 'Exact', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
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
      <Card className={cn('relative overflow-hidden shadow-card', config.bgColor, config.borderColor)}>
        <CardContent className="relative p-6 md:p-8">
          <div className="flex flex-col items-center gap-5 animate-in fade-in slide-in-from-bottom-4 duration-400">
            {/* Result icon & label */}
            <div className={cn('flex items-center gap-2 text-xl font-bold', config.color)}>
              <Icon className="size-6" />
              {config.label}
            </div>

            {/* Accuracy badge + Grader badge */}
            <div className="flex items-center gap-3">
              <Badge className={cn('text-sm px-3 py-1', config.badgeBg)}>
                {Math.round(result.accuracy)}% accuracy
              </Badge>
              <Badge variant="outline" className="text-xs">
                {config.detailLabel}
              </Badge>
              {result.grader === 'labse' && (
                <Badge variant="outline" className={cn('text-xs gap-1', graderInfo.color)}>
                  <GraderIcon className="size-3" />
                  {graderInfo.label}
                </Badge>
              )}
            </div>

            {/* Your answer vs correct answer */}
            <div className="w-full max-w-md space-y-3">
              {/* User's answer */}
              <div className={cn(
                'rounded-xl p-4 border',
                result.is_correct
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
              )}>
                <p className="text-xs text-muted-foreground mb-1">Câu trả lời của bạn</p>
                <p className={cn(
                  'text-lg font-semibold',
                  result.is_correct ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                )}>
                  {result.user_answer}
                </p>
              </div>

              {/* Correct answer */}
              <div className="rounded-xl p-4 border bg-primary/5 border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Đáp án đúng</p>
                <p className="text-lg font-bold text-foreground">{result.correct_answer}</p>
                {result.pronunciation && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Volume2 className="size-3" />/{result.pronunciation}/
                  </p>
                )}
              </div>
            </div>

            {/* Example sentence */}
            {result.example_english && (
              <div className="w-full max-w-md rounded-xl bg-muted/50 p-4 border border-muted">
                <p className="text-sm text-foreground flex items-center gap-1.5"><Globe className="size-3.5 shrink-0 text-blue-500" /> {result.example_english}</p>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5"><Globe className="size-3.5 shrink-0 text-red-500" /> {result.example_vietnamese}</p>
              </div>
            )}

            {/* Continue button */}
            <Button
              onClick={onContinue}
              disabled={submitting}
              className="w-full max-w-md h-12 text-base font-semibold rounded-xl gap-2"
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
