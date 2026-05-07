'use client';

import { useState } from 'react';
import {
  Play,
  CheckCircle2,
  Circle,
  Lock,
  Clock,
  FileText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

/** Single lesson item */
interface Lesson {
  id: number;
  title: string;
  duration: string;
  type: 'video' | 'quiz' | 'reading';
  status: 'completed' | 'current' | 'locked' | 'available';
}

/** Section containing multiple lessons */
interface Section {
  id: number;
  title: string;
  lessons: Lesson[];
}

/** Mock curriculum data */
const curriculumData: Section[] = [
  {
    id: 1,
    title: 'Getting Started',
    lessons: [
      { id: 1, title: 'Greetings & Introductions', duration: '38 min', type: 'video', status: 'current' },
      { id: 2, title: 'Common Phrases & Expressions', duration: '32 min', type: 'video', status: 'available' },
      { id: 3, title: 'Basic Pronunciation Guide', duration: '25 min', type: 'video', status: 'available' },
      { id: 4, title: 'Quiz: Introduction Basics', duration: '15 min', type: 'quiz', status: 'available' },
    ],
  },
  {
    id: 2,
    title: 'Everyday Conversations',
    lessons: [
      { id: 5, title: 'Talking About Yourself', duration: '35 min', type: 'video', status: 'locked' },
      { id: 6, title: 'Asking & Answering Questions', duration: '40 min', type: 'video', status: 'locked' },
      { id: 7, title: 'Numbers & Time', duration: '28 min', type: 'video', status: 'locked' },
      { id: 8, title: 'Reading: Daily Dialogues', duration: '20 min', type: 'reading', status: 'locked' },
    ],
  },
  {
    id: 3,
    title: 'Building Vocabulary',
    lessons: [
      { id: 9, title: 'Family & Relationships', duration: '30 min', type: 'video', status: 'locked' },
      { id: 10, title: 'Food & Dining', duration: '33 min', type: 'video', status: 'locked' },
      { id: 11, title: 'Shopping & Money', duration: '27 min', type: 'video', status: 'locked' },
      { id: 12, title: 'Quiz: Vocabulary Builder', duration: '20 min', type: 'quiz', status: 'locked' },
    ],
  },
  {
    id: 4,
    title: 'Grammar Foundations',
    lessons: [
      { id: 13, title: 'Present Simple Tense', duration: '42 min', type: 'video', status: 'locked' },
      { id: 14, title: 'Articles & Determiners', duration: '36 min', type: 'video', status: 'locked' },
      { id: 15, title: 'Reading: Grammar in Context', duration: '25 min', type: 'reading', status: 'locked' },
      { id: 16, title: 'Quiz: Grammar Check', duration: '18 min', type: 'quiz', status: 'locked' },
    ],
  },
];

/** Status icon renderer */
function StatusIcon({ status }: { status: Lesson['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />;
    case 'current':
      return (
        <div className="flex size-5 items-center justify-center rounded-full bg-primary shrink-0">
          <Play className="size-2.5 text-primary-foreground fill-primary-foreground ml-0.5" />
        </div>
      );
    case 'locked':
      return <Lock className="size-4 text-muted-foreground/50 shrink-0" />;
    case 'available':
      return <Circle className="size-5 text-muted-foreground shrink-0" />;
  }
}

/** Type badge renderer */
function TypeBadge({ type }: { type: Lesson['type'] }) {
  const config = {
    video: { label: 'Video', className: 'bg-primary/10 text-primary hover:bg-primary/10' },
    quiz: { label: 'Quiz', className: 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/10' },
    reading: { label: 'Reading', className: 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10' },
  };
  const c = config[type];
  return <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', c.className)}>{c.label}</Badge>;
}

/**
 * CurriculumTab - Displays course sections and lessons with
 * progress indicators, lesson types, and expandable sections.
 */
export function CurriculumTab() {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([1]));

  const toggleSection = (sectionId: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  /** Calculate section completion percentage */
  const getSectionProgress = (section: Section) => {
    const completed = section.lessons.filter((l) => l.status === 'completed').length;
    return Math.round((completed / section.lessons.length) * 100);
  };

  const totalLessons = curriculumData.reduce((acc, s) => acc + s.lessons.length, 0);
  const completedLessons = curriculumData.reduce(
    (acc, s) => acc + s.lessons.filter((l) => l.status === 'completed').length,
    0
  );

  return (
    <ScrollArea className="h-[500px] pr-3">
      {/* Summary */}
      <div className="mb-4 rounded-lg bg-muted/50 p-3">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">
            {completedLessons} of {totalLessons} lessons completed
          </span>
          <span className="font-semibold text-primary">
            {Math.round((completedLessons / totalLessons) * 100)}%
          </span>
        </div>
        <Progress value={(completedLessons / totalLessons) * 100} className="h-1.5" />
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {curriculumData.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const sectionProgress = getSectionProgress(section);

          return (
            <div key={section.id} className="rounded-lg border border-border overflow-hidden">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Section {section.id}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {section.lessons.length} lessons
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{section.title}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium text-muted-foreground">{sectionProgress}%</span>
                  <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${sectionProgress}%` }}
                    />
                  </div>
                </div>
              </button>

              {/* Lessons List */}
              {isExpanded && (
                <div className="border-t border-border">
                  {section.lessons.map((lesson, idx) => (
                    <button
                      key={lesson.id}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/30',
                        lesson.status === 'current' && 'bg-primary/5',
                        idx < section.lessons.length - 1 && 'border-b border-border/50'
                      )}
                      disabled={lesson.status === 'locked'}
                    >
                      <StatusIcon status={lesson.status} />
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'text-sm font-medium truncate',
                            lesson.status === 'locked' && 'text-muted-foreground/50',
                            lesson.status === 'completed' && 'text-muted-foreground line-through',
                            lesson.status === 'current' && 'text-foreground'
                          )}
                        >
                          {lesson.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="size-3 text-muted-foreground/60" />
                          <span className="text-xs text-muted-foreground/60">{lesson.duration}</span>
                          <TypeBadge type={lesson.type} />
                        </div>
                      </div>
                      {lesson.status === 'current' && (
                        <Badge className="bg-primary text-primary-foreground text-[10px] shrink-0">
                          In Progress
                        </Badge>
                      )}
                      {lesson.status === 'completed' && (
                        <FileText className="size-4 text-emerald-500/50 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
