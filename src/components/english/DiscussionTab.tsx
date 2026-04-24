'use client';

import { useState } from 'react';
import { Send, ThumbsUp, Reply, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

/** Comment type */
interface Comment {
  id: number;
  author: string;
  avatarInitials: string;
  avatarColor: string;
  content: string;
  timestamp: string;
  likes: number;
  replies: Comment[];
}

/** Mock discussion data */
const initialComments: Comment[] = [
  {
    id: 1,
    author: 'Emily Chen',
    avatarInitials: 'EC',
    avatarColor: 'bg-emerald-500/15 text-emerald-600',
    content: 'This lesson is really helpful! I finally understand the difference between formal and informal greetings. The examples with "Good morning" vs "Hey" were super clear.',
    timestamp: '2 hours ago',
    likes: 12,
    replies: [
      {
        id: 2,
        author: 'Sarah Mitchell',
        avatarInitials: 'SM',
        avatarColor: 'bg-primary/15 text-primary',
        content: 'Glad you found it helpful, Emily! Try practicing with a friend - role-playing really reinforces these patterns.',
        timestamp: '1 hour ago',
        likes: 5,
        replies: [],
      },
    ],
  },
  {
    id: 3,
    author: 'Marco Silva',
    avatarInitials: 'MS',
    avatarColor: 'bg-amber-500/15 text-amber-600',
    content: 'I have a question: when is it appropriate to use "How do you do?" I hear it\'s quite formal and not commonly used in everyday conversation anymore.',
    timestamp: '45 min ago',
    likes: 8,
    replies: [
      {
        id: 4,
        author: 'Sarah Mitchell',
        avatarInitials: 'SM',
        avatarColor: 'bg-primary/15 text-primary',
        content: 'Great question, Marco! "How do you do?" is indeed very formal and somewhat old-fashioned. In modern English, "Nice to meet you" or "Pleased to meet you" is more common for first introductions. "How do you do?" is mainly used in very formal British English contexts.',
        timestamp: '30 min ago',
        likes: 15,
        replies: [],
      },
    ],
  },
  {
    id: 5,
    author: 'Aisha Khan',
    avatarInitials: 'AK',
    avatarColor: 'bg-rose-500/15 text-rose-600',
    content: 'The pronunciation guide at the end was amazing. I\'ve been struggling with the "th" sound and the tips about tongue placement really helped!',
    timestamp: '20 min ago',
    likes: 6,
    replies: [],
  },
];

/**
 * DiscussionTab - Simple discussion thread with comments,
 * reply functionality, and like actions.
 */
export function DiscussionTab() {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 300));

    const newC: Comment = {
      id: Date.now(),
      author: 'You',
      avatarInitials: 'Y',
      avatarColor: 'bg-primary/15 text-primary',
      content: newComment.trim(),
      timestamp: 'Just now',
      likes: 0,
      replies: [],
    };
    setComments((prev) => [newC, ...prev]);
    setNewComment('');
    setSubmitting(false);
  };

  const handleSubmitReply = async (parentId: number) => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 300));

    const newReply: Comment = {
      id: Date.now(),
      author: 'You',
      avatarInitials: 'Y',
      avatarColor: 'bg-primary/15 text-primary',
      content: replyText.trim(),
      timestamp: 'Just now',
      likes: 0,
      replies: [],
    };

    setComments((prev) =>
      prev.map((c) => {
        if (c.id === parentId) {
          return { ...c, replies: [...c.replies, newReply] };
        }
        return c;
      })
    );
    setReplyText('');
    setReplyingTo(null);
    setSubmitting(false);
  };

  const handleLike = (commentId: number, isReply = false, parentId?: number) => {
    setComments((prev) =>
      prev.map((c) => {
        if (!isReply && c.id === commentId) {
          return { ...c, likes: c.likes + 1 };
        }
        if (isReply && c.id === parentId) {
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === commentId ? { ...r, likes: r.likes + 1 } : r
            ),
          };
        }
        return c;
      })
    );
  };

  /** Render a single comment */
  const renderComment = (comment: Comment, isReply = false, parentId?: number) => (
    <div key={comment.id} className={cn('flex gap-3', isReply && 'ml-10 mt-3')}>
      <Avatar className={cn('shrink-0', isReply ? 'size-7' : 'size-9')}>
        <AvatarFallback className={cn('text-xs font-bold', comment.avatarColor)}>
          {comment.avatarInitials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('font-semibold text-foreground', isReply ? 'text-xs' : 'text-sm')}>
            {comment.author}
          </span>
          {comment.author === 'Sarah Mitchell' && (
            <Badge className="bg-primary/10 text-primary text-[9px] px-1.5 py-0 hover:bg-primary/10">
              Instructor
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
        </div>
        <p className={cn('text-foreground leading-relaxed mt-1', isReply ? 'text-xs' : 'text-sm')}>
          {comment.content}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <button
            onClick={() => handleLike(comment.id, isReply, parentId)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ThumbsUp className="size-3" />
            {comment.likes > 0 && comment.likes}
          </button>
          {!isReply && (
            <button
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Reply className="size-3" />
              Reply
            </button>
          )}
        </div>

        {/* Reply input */}
        {!isReply && replyingTo === comment.id && (
          <div className="flex items-center gap-2 mt-2">
            <Textarea
              placeholder={`Reply to ${comment.author}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-[40px] text-xs"
            />
            <Button
              size="sm"
              className="shrink-0 h-8 w-8 p-0"
              onClick={() => handleSubmitReply(comment.id)}
              disabled={!replyText.trim() || submitting}
            >
              <Send className="size-3.5" />
            </Button>
          </div>
        )}

        {/* Replies */}
        {!isReply && comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map((reply) => renderComment(reply, true, comment.id))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* New comment input */}
      <div className="flex items-start gap-3">
        <Avatar className="size-9 shrink-0">
          <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">Y</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            placeholder="Share your thoughts or ask a question..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[60px] resize-y"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
            >
              <Send className="size-3.5" />
              Post
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Comments thread */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          Discussion ({comments.length} threads)
        </span>
        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <MoreHorizontal className="size-3.5" />
          Sort by
        </button>
      </div>

      <ScrollArea className="h-[340px]">
        <div className="space-y-5">
          {comments.map((comment) => renderComment(comment))}
        </div>
      </ScrollArea>
    </div>
  );
}
