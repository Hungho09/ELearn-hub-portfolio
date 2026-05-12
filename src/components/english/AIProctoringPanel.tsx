'use client';

import { useState } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** Chat message type */
interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/** Predefined quick questions */
const quickQuestions = [
  'Explain this lesson',
  'Grammar tips',
  'Pronunciation help',
  'Practice exercises',
];

/** Initial AI messages */
const initialMessages: ChatMessage[] = [
  {
    id: 1,
    role: 'assistant',
    content: "Hi! I'm your AI learning assistant. I can help you understand the lesson, answer questions about English grammar, or provide practice exercises. What would you like to know?",
    timestamp: 'Now',
  },
];

/**
 * AIProctoringPanel - AI assistant chat panel for course-related
 * questions with a status card and chat interface.
 */
export function AIProctoringPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    await new Promise((r) => setTimeout(r, 1200));

    const responses: Record<string, string> = {
      default:
        "That's a great question! In English, context matters a lot. Let me break this down for you based on the current lesson material. The key is to practice consistently and use these phrases in real conversations.",
      grammar:
        "For grammar, remember the basic sentence structure: Subject + Verb + Object. In greetings, we often use the imperative or declarative forms. Example: 'How are you?' follows the Subject + Verb pattern.",
      pronunciation:
        "For pronunciation, focus on the stress patterns. In 'Good MORNing', the stress falls on the second syllable. Try recording yourself and comparing with native speakers!",
      practice:
        "Here's a quick exercise: Introduce yourself using the pattern: 'Hello, my name is [name]. I'm from [place]. Nice to meet you!' Practice this 5 times with different names and places.",
    };

    const inputLower = input.toLowerCase();
    let responseText = responses.default;
    if (inputLower.includes('grammar') || inputLower.includes('tense')) {
      responseText = responses.grammar;
    } else if (inputLower.includes('pronunciation') || inputLower.includes('sound')) {
      responseText = responses.pronunciation;
    } else if (inputLower.includes('practice') || inputLower.includes('exercise')) {
      responseText = responses.practice;
    }

    const aiMsg: ChatMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: responseText,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, aiMsg]);
    setIsTyping(false);
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">AI Assistant</CardTitle>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="flex size-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-emerald-600 font-medium">Active</span>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary hover:bg-primary/10">
            <Sparkles className="size-3 mr-0.5" />
            AI
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Quick questions */}
        <div className="flex flex-wrap gap-1.5">
          {quickQuestions.map((q) => (
            <button
              key={q}
              onClick={() => handleQuickQuestion(q)}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat messages */}
        <ScrollArea className="h-[200px] rounded-lg bg-muted/30 p-3">
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-2',
                  msg.role === 'user' && 'flex-row-reverse'
                )}
              >
                <div
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                    msg.role === 'assistant'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-primary text-primary-foreground'
                  )}
                >
                  {msg.role === 'assistant' ? <Bot className="size-3" /> : 'Y'}
                </div>
                <div
                  className={cn(
                    'rounded-lg px-3 py-2 text-xs leading-relaxed max-w-[85%]',
                    msg.role === 'assistant'
                      ? 'bg-card border border-border text-foreground'
                      : 'bg-primary text-primary-foreground'
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="size-3" />
                </div>
                <div className="rounded-lg px-3 py-2 bg-card border border-border">
                  <div className="flex gap-1">
                    <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                    <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                    <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex items-center gap-2">
          <Textarea
            placeholder="Ask about this lesson..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="min-h-[36px] text-xs resize-none"
          />
          <Button
            size="sm"
            className="shrink-0 h-9 w-9 p-0"
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
          >
            <Send className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
