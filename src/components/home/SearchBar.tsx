'use client';

import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/** Props for the SearchBar component */
interface SearchBarProps {
  /** Callback when mobile menu toggle is clicked */
  onMobileMenuToggle?: () => void;
}

/**
 * SearchBar - Top search input with filter button.
 * Includes a hamburger menu toggle for mobile view.
 */
export function SearchBar({ onMobileMenuToggle }: SearchBarProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Mobile menu toggle - visible only on small screens */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 lg:hidden"
        onClick={onMobileMenuToggle}
        aria-label="Toggle navigation menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="size-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </Button>

      {/* Search input with icon */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for courses..."
          className="h-10 pl-9 pr-4 bg-muted/50 border-none focus-visible:bg-background focus-visible:border-primary focus-visible:ring-primary/30"
        />
      </div>

      {/* Filter button */}
      <Button variant="outline" size="icon" className="shrink-0 h-10 w-10">
        <SlidersHorizontal className="size-4" />
        <span className="sr-only">Filter courses</span>
      </Button>
    </div>
  );
}
