'use client';

import { useState, useCallback } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Sidebar } from '@/components/home/Sidebar';
import { SearchBar } from '@/components/home/SearchBar';
import { HeroBanner } from '@/components/home/HeroBanner';
import { CourseProgressCards } from '@/components/home/CourseProgressCards';
import { ContinueWatching } from '@/components/home/ContinueWatching';
import { RightSidebar } from '@/components/home/RightSidebar';

/**
 * Home page - Self-learning platform dashboard.
 * Features a 3-column layout with sidebar, main content, and right sidebar.
 * Responsive design adapts to mobile, tablet, and desktop viewports.
 */
export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /** Handle mobile menu toggle */
  const handleMobileMenuToggle = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  /** Close mobile menu on navigation */
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

        {/* Mobile sidebar - uses Sheet component for slide-out drawer */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-[260px]">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <Sidebar collapsed={false} onNavigate={handleMobileNavClose} />
          </SheetContent>
        </Sheet>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="mx-auto max-w-4xl p-5 md:p-6 lg:p-8">
            {/* Search bar at top */}
            <SearchBar onMobileMenuToggle={handleMobileMenuToggle} />

            {/* Hero banner */}
            <div className="mt-6">
              <HeroBanner />
            </div>

            {/* Course progress cards */}
            <div className="mt-8">
              <CourseProgressCards />
            </div>

            {/* Continue watching section */}
            <div className="mt-8 pb-8">
              <ContinueWatching />
            </div>
          </div>
        </main>

        {/* Right Sidebar - Visible only on lg+ */}
        <div className="hidden lg:block shrink-0 border-l border-border">
          <RightSidebar />
        </div>
      </div>
    </TooltipProvider>
  );
}
