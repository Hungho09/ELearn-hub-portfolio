'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import { ProfileForm } from '@/components/auth/ProfileForm';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden select-none">
      
      {/* Aurora Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 dark:bg-primary/5 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#A29BFE]/5 dark:bg-[#A29BFE]/3 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/25 bg-background/50 backdrop-blur-md relative">
        <div className="mx-auto max-w-2xl flex items-center gap-4 px-4 py-3.5">
          <Link href="/">
            <Button variant="ghost" size="icon" className="shrink-0 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <ArrowLeft strokeWidth={1.2} className="size-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[#A29BFE] shadow-[0_2px_8px_rgba(108,92,231,0.2)]">
              <GraduationCap strokeWidth={1.5} className="size-4 text-white" />
            </div>
            <h1 className="text-sm font-extrabold tracking-tight text-foreground">Hồ Sơ Của Tôi</h1>
          </div>
        </div>
      </header>

      {/* Profile Content */}
      <main className="mx-auto max-w-2xl p-4 md:p-6 pb-12 relative z-10">
        <ProfileForm />
      </main>
    </div>
  );
}
