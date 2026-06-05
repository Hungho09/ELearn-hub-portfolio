'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Users2,
  ChevronRight,
  Sparkles,
  Quote,
  Flame,
  Volume2,
} from 'lucide-react';
import { Sidebar } from '@/components/home/Sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

const ZEN_QUOTES = [
  { text: "Để đạt được tri thức, hãy học cách thêm vào mỗi ngày. Để đạt được trí tuệ, hãy học cách buông bỏ đi mỗi ngày.", author: "Lão Tử" },
  { text: "Sự tập trung là chìa khóa mở mọi cánh cửa của sự hiểu biết.", author: "Khuyết danh" },
  { text: "Đừng so sánh mình với người khác, hãy so sánh mình của ngày hôm nay với ngày hôm qua.", author: "Khuyết danh" },
  { text: "Mỗi ngày học tập là một ngày bạn gieo hạt giống cho tương lai huy hoàng.", author: "Khuyết danh" },
  { text: "Trí tuệ không phải là sản phẩm của học tập đơn thuần, mà là nỗ lực tích lũy suốt cả cuộc đời.", author: "Albert Einstein" },
  { text: "Sự chú ý trọn vẹn là hình thức cao nhất của sự hào phóng và tập trung.", author: "Simone Weil" },
  { text: "Thành công là tổng hợp của những nỗ lực nhỏ bé, được lặp đi lặp lại ngày qua ngày.", author: "Robert Collier" }
];

export default function WorkspaceLobbyPage() {
  const router = useRouter();
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  // Xoay vòng danh ngôn mỗi 10 giây
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % ZEN_QUOTES.length);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-transparent text-foreground font-sans relative">

        {/* Aurora Background Blobs - Isolated to prevent parent auto-scrolling */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 dark:bg-primary/5 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#A29BFE]/5 dark:bg-[#A29BFE]/3 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
          <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] rounded-full bg-emerald-500/5 dark:bg-emerald-500/[0.02] blur-[80px]" />
        </div>

        {/* Sidebar */}
        <div className="h-full shrink-0 overflow-hidden">
          <Sidebar collapsed={false} />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-12 flex flex-col justify-between relative z-10">

          {/* Header */}
          <div className="flex flex-col gap-2">
            {/* <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold w-fit dark:text-[#A29BFE] dark:border-[#A29BFE]/20 dark:bg-[#A29BFE]/5"
            >
              <Sparkles className="size-3.5 animate-pulse" />
              <span>Không gian học tập tương lai - Glassmorphism 2026</span>
            </motion.div> */}
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-[#A29BFE] leading-tight"
            >
              Workspace Online
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-muted-foreground text-sm md:text-base max-w-2xl"
            >
              Chào mừng bạn đến với không gian học tập trực tuyến cao cấp. Lựa chọn chế độ học để bắt đầu hành trình nâng tầm tri thức của bạn ngay hôm nay.
            </motion.p>
          </div>

          {/* Lobby Choice Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-auto py-8 max-w-5xl w-full mx-auto">

            {/* Card 1: Zen Focus Space */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 100, delay: 0.3 }}
              whileHover={{ y: -8, scale: 1.01 }}
              onClick={() => router.push('/workspace/focus')}
              className="group relative cursor-pointer overflow-hidden rounded-[2.25rem] p-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-sm"
            >
              <div className="rounded-[calc(2.25rem-4px)] bg-[#ffffff]/50 dark:bg-[#0c0c1b]/50 backdrop-blur-2xl border border-white/20 dark:border-white/5 p-8 flex flex-col justify-between h-full min-h-[320px] relative">
                {/* Decorative Corner Light */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div>
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary dark:text-[#A29BFE] dark:border-[#A29BFE]/20 shadow-[0_0_20px_rgba(108,92,231,0.05)] group-hover:scale-110 transition-transform duration-300">
                    <Clock strokeWidth={1.2} className="size-7" />
                  </div>
                  <h2 className="text-2xl font-bold mt-6 text-foreground group-hover:text-primary dark:group-hover:text-[#A29BFE] transition-colors">
                    Zen Focus Space
                  </h2>
                  <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
                    Không gian tĩnh lặng riêng tư dành riêng cho bạn. Sử dụng đồng hồ Pomodoro LED Neon tròn, trình phát nhạc YouTube Lofi Girl Live, bộ trộn âm thanh thiên nhiên và Todo-list tối giản để học sâu tuyệt đối.
                  </p>
                </div>

                <div className="flex items-center justify-between mt-8 border-t border-border/40 pt-4 text-sm font-semibold text-primary dark:text-[#A29BFE] group/btn">
                  <span className="opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex items-center gap-1.5">
                    <Flame strokeWidth={1.2} className="size-4 animate-bounce text-amber-500" />
                    Bắt đầu Focus cá nhân
                  </span>
                  <div className="relative flex items-center justify-center rounded-full p-1.5 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/btn:scale-105 active:scale-95">
                    <div className="flex size-8 items-center justify-center rounded-full bg-[#ffffff] dark:bg-[#0c0c1b] border border-white/20 dark:border-white/5 shadow-sm group-hover/btn:bg-primary/15 dark:group-hover/btn:bg-[#A29BFE]/15 transition-colors">
                      <ChevronRight strokeWidth={1.2} className="size-4 text-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 2: Public Study Hub */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 100, delay: 0.4 }}
              whileHover={{ y: -8, scale: 1.01 }}
              onClick={() => router.push('/workspace/hub')}
              className="group relative cursor-pointer overflow-hidden rounded-[2.25rem] p-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-sm"
            >
              <div className="rounded-[calc(2.25rem-4px)] bg-[#ffffff]/50 dark:bg-[#0c0c1b]/50 backdrop-blur-2xl border border-white/20 dark:border-white/5 p-8 flex flex-col justify-between h-full min-h-[320px] relative">
                {/* Decorative Corner Light */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div>
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.05)] group-hover:scale-110 transition-transform duration-300">
                    <Users2 strokeWidth={1.2} className="size-7" />
                  </div>
                  <h2 className="text-2xl font-bold mt-6 text-foreground group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                    Public Study Hub
                  </h2>
                  <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
                    Học cùng bạn bè và những người học khác trên khắp thế giới. Cùng nhau duy trì ngọn lửa kỷ luật, chia sẻ trạng thái học thực tế, thả các hạt emoji truyền động lực lơ lửng và trò chuyện tại khung chat pha lê.
                  </p>
                </div>

                <div className="flex items-center justify-between mt-8 border-t border-border/40 pt-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400 group/btn">
                  <span className="opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex items-center gap-1.5">
                    <Volume2 strokeWidth={1.2} className="size-4 animate-pulse text-emerald-500" />
                    Tham gia phòng học chung
                  </span>
                  <div className="relative flex items-center justify-center rounded-full p-1.5 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/btn:scale-105 active:scale-95">
                    <div className="flex size-8 items-center justify-center rounded-full bg-[#ffffff] dark:bg-[#0c0c1b] border border-white/20 dark:border-white/5 shadow-sm group-hover/btn:bg-emerald-500/15 dark:group-hover/btn:bg-emerald-400/15 transition-colors">
                      <ChevronRight strokeWidth={1.2} className="size-4 text-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>

          {/* Footer Zen Quote Box */}
          <div className="w-full max-w-3xl mx-auto mb-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="p-1 rounded-[2rem] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm"
            >
              <div className="relative overflow-hidden rounded-[calc(2rem-4px)] bg-[#ffffff]/50 dark:bg-[#0c0c1b]/50 backdrop-blur-2xl border border-white/20 dark:border-white/5 p-5 flex items-center gap-4 text-center justify-center min-h-[90px]">
                <div className="absolute top-2 left-3 opacity-10">
                  <Quote strokeWidth={1.2} className="size-10 text-foreground" />
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuoteIndex}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center justify-center gap-1 z-10 px-6"
                  >
                    <p className="text-foreground text-sm md:text-base font-medium italic select-none">
                      "{ZEN_QUOTES[currentQuoteIndex].text}"
                    </p>
                    <p className="text-primary text-xs font-semibold tracking-wider uppercase mt-1 dark:text-[#A29BFE]/80">
                      — {ZEN_QUOTES[currentQuoteIndex].author}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

        </main>
      </div>
    </TooltipProvider>
  );
}
