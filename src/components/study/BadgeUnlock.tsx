'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Medal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface BadgeUnlockProps {
  badges: string[];
  onClose: () => void;
}

const BADGE_LABELS: Record<string, string> = {
  FIRST_BLOOD: 'Bước chân đầu tiên',
  STREAK_3: 'Lính mới chăm chỉ',
  STREAK_7: 'Chiến binh kỷ luật',
  MASTER_10: 'Bậc thầy nhập môn',
  SCHOLAR_100: 'Học giả kiên trì',
  NIGHT_OWL: 'Cú đêm',
};

const BADGE_EMOJI: Record<string, string> = {
  FIRST_BLOOD: '🩸',
  STREAK_3: '💪',
  STREAK_7: '🔥',
  MASTER_10: '🏆',
  SCHOLAR_100: '📚',
  NIGHT_OWL: '🌙',
};

function BadgeItem({ code, index }: { code: string; index: number }) {
  return (
    <motion.div
      className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + index * 0.1, duration: 0.3 }}
    >
      <span className="text-2xl">{BADGE_EMOJI[code] ?? '🏅'}</span>
      <div className="flex flex-col">
        <span className="text-sm font-semibold">Huy hiệu mới!</span>
        <span className="text-xs text-muted-foreground">{BADGE_LABELS[code] ?? code}</span>
      </div>
    </motion.div>
  );
}

export function BadgeUnlock({ badges, onClose }: BadgeUnlockProps) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOpen(false);
      setTimeout(onClose, 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed top-5 right-5 z-50 max-w-xs w-[90%] space-y-2"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Medal className="size-4 text-amber-500" />
              <span className="text-sm font-semibold">{badges.length} huy hiệu mới</span>
            </div>
            <Button variant="ghost" size="icon" className="size-6" onClick={handleClose}>
              <X className="size-3" />
            </Button>
          </div>
          {badges.map((code, i) => (
            <BadgeItem key={code} code={code} index={i} />
          ))}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
