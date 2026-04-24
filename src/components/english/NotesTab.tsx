'use client';

import { useState } from 'react';
import { Save, FileText, Plus, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

/** Saved note type */
interface Note {
  id: number;
  content: string;
  timestamp: string;
  lessonTitle: string;
}

/** Initial saved notes */
const initialNotes: Note[] = [
  {
    id: 1,
    content: 'Common greetings: "Hello", "Hi", "Good morning/afternoon/evening". Formal vs informal greetings differ by context.',
    timestamp: '2 min ago',
    lessonTitle: 'Lesson 1: Greetings',
  },
  {
    id: 2,
    content: 'Self-introduction pattern: Name + Where you\'re from + What you do. Example: "Hi, I\'m Alex from New York. I\'m a software engineer."',
    timestamp: '5 min ago',
    lessonTitle: 'Lesson 1: Greetings',
  },
];

/**
 * NotesTab - Text area for taking notes with save functionality
 * and a list of previously saved notes.
 */
export function NotesTab() {
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [saving, setSaving] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);

  const handleSave = async () => {
    if (!noteText.trim()) return;
    setSaving(true);

    // Simulate save delay
    await new Promise((r) => setTimeout(r, 500));

    const newNote: Note = {
      id: Date.now(),
      content: noteText.trim(),
      timestamp: 'Just now',
      lessonTitle: 'Lesson 1: Greetings',
    };

    setNotes((prev) => [newNote, ...prev]);
    setNoteText('');
    setSaving(false);
  };

  const handleDelete = (id: number) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedNoteId === id) {
      setSelectedNoteId(null);
    }
  };

  const handleSelectNote = (note: Note) => {
    if (selectedNoteId === note.id) {
      setSelectedNoteId(null);
      setNoteText('');
    } else {
      setSelectedNoteId(note.id);
      setNoteText(note.content);
    }
  };

  return (
    <div className="space-y-4">
      {/* Note editor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {selectedNoteId ? 'Edit Note' : 'New Note'}
            </span>
          </div>
          {selectedNoteId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => {
                setSelectedNoteId(null);
                setNoteText('');
              }}
            >
              <Plus className="size-3 mr-1" />
              New Note
            </Button>
          )}
        </div>

        <Textarea
          placeholder="Take notes for this lesson... (e.g., Key vocabulary, grammar rules, pronunciation tips)"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          className="min-h-[120px] resize-y"
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {noteText.length} characters
          </span>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={handleSave}
            disabled={!noteText.trim() || saving}
          >
            <Save className="size-3.5" />
            {saving ? 'Saving...' : 'Save Note'}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Saved notes list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-foreground">
            Saved Notes
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {notes.length}
          </Badge>
        </div>

        <ScrollArea className="h-[280px]">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileText className="size-8 mb-2 opacity-30" />
              <p className="text-sm">No notes yet</p>
              <p className="text-xs">Start taking notes for this lesson</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={cn(
                    'group rounded-lg border p-3 cursor-pointer transition-colors',
                    selectedNoteId === note.id
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border hover:border-primary/20 hover:bg-muted/30'
                  )}
                  onClick={() => handleSelectNote(note)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-foreground leading-relaxed line-clamp-2 flex-1">
                      {note.content}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(note.id);
                      }}
                      className="shrink-0 rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary hover:bg-primary/10">
                      {note.lessonTitle}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {note.timestamp}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
