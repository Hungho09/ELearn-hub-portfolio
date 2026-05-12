'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  Search,
  BookOpen,
  MessageSquare,
  StickyNote,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/home/Sidebar';
import { VideoPlayer } from '@/components/english/VideoPlayer';
import { CurriculumTab } from '@/components/english/CurriculumTab';
import { NotesTab } from '@/components/english/NotesTab';
import { DiscussionTab } from '@/components/english/DiscussionTab';
import { AIProctoringPanel } from '@/components/english/AIProctoringPanel';
import { CourseProgress } from '@/components/english/CourseProgress';
import { RelatedCourses } from '@/components/english/RelatedCourses';

/**
 * English Course page - Full course view with video player,
 * tabbed content, AI assistant, and course progress.
 * Responsive layout with sidebar on mobile and 2-column on desktop.
 */
export default function EnglishCoursePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('curriculum');

  const userName = session?.user?.name || 'Guest';
  const userAvatar = session?.user?.avatar || '/images/user-avatar.png';
  const userInitial = userName.charAt(0).toUpperCase();

  const handleMobileMenuToggle = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  const handleMobileNavClose = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Left Sidebar - Hidden on mobile, visible on md+ */}
        <div className="hidden md:block shrink-0">
          <Sidebar collapsed={false} />
        </div>

        {/* Mobile sidebar drawer */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-[260px]">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <Sidebar collapsed={false} onNavigate={handleMobileNavClose} />
          </SheetContent>
        </Sheet>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Top Navigation Bar */}
          <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
            <div className="flex items-center justify-between px-4 py-3 md:px-6">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-foreground md:hidden"
                  onClick={handleMobileMenuToggle}
                >
                  <Menu className="size-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => router.push('/')}
                >
                  <ArrowLeft className="size-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
                <div className="flex items-center gap-2">
                  <BookOpen className="size-5 text-primary" />
                  <h1 className="text-base font-bold text-foreground">English Course</h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Search className="size-4" />
                </Button>
                <Avatar className="size-8 ring-2 ring-primary/20 cursor-pointer">
                  <AvatarImage src={userAvatar} alt={userName} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          {/* Content Area - 2 Column Layout on lg+ */}
          <div className="flex flex-col lg:flex-row">
            {/* Main Content Column */}
            <div className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 space-y-6">
              {/* Video Player */}
              <VideoPlayer />

              {/* Tabbed Content */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="curriculum" className="gap-1.5">
                    <BookOpen className="size-3.5" />
                    <span>Curriculum</span>
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="gap-1.5">
                    <StickyNote className="size-3.5" />
                    <span>Notes</span>
                  </TabsTrigger>
                  <TabsTrigger value="discussion" className="gap-1.5">
                    <MessageSquare className="size-3.5" />
                    <span>Discussion</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="curriculum" className="mt-4">
                  <CurriculumTab />
                </TabsContent>
                <TabsContent value="notes" className="mt-4">
                  <NotesTab />
                </TabsContent>
                <TabsContent value="discussion" className="mt-4">
                  <DiscussionTab />
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Sidebar - Visible on lg+ */}
            <div className="hidden lg:block shrink-0 w-[300px] border-l border-border p-4 space-y-4 overflow-y-auto custom-scrollbar">
              <AIProctoringPanel />
              <CourseProgress />
              <RelatedCourses />
            </div>
          </div>

          {/* Mobile Bottom Section - AI & Progress below tabs */}
          <div className="lg:hidden p-4 md:p-6 space-y-4 border-t border-border">
            <AIProctoringPanel />
            <CourseProgress />
            <RelatedCourses />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
