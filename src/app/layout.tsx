import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from "@/components/auth/SessionProvider";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "LearnHub - Self-Learning Platform",
  description: "Sharpen your skills with professional online courses. Learn at your own pace with expert mentors.",
  keywords: ["learning", "online courses", "self-study", "education", "e-learning"],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} antialiased bg-background text-foreground font-sans min-h-screen relative`}
      >
        {/* Organic Animated Aurora Blobs */}
        <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none select-none opacity-40 dark:opacity-60 bg-[#fafafc] dark:bg-[#080811]">
          {/* Blob 1: Purple Neon */}
          <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-[#6C5CE7]/35 to-[#A29BFE]/10 blur-[120px] animate-aurora-1" />
          {/* Blob 2: Cyan Neon */}
          <div className="absolute -bottom-[10%] -right-[10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-br from-[#55EFC4]/25 to-[#74B9FF]/10 blur-[130px] animate-aurora-2" />
          {/* Blob 3: Indigo Neon */}
          <div className="absolute top-[35%] right-[20%] w-[35vw] h-[35vw] rounded-full bg-gradient-to-br from-[#6C5CE7]/15 to-[#74B9FF]/5 blur-[100px] animate-aurora-3" />
        </div>
        
        <SessionProvider>
          {children}
        </SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
