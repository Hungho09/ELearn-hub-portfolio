'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Star, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface LevelUpModalProps {
  prevLevel: number;
  newLevel: number;
  onClose: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
}

const COLORS = ['#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899'];

export function LevelUpModal({ prevLevel, newLevel, onClose }: LevelUpModalProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    const generated = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: -10 - Math.random() * 40,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 4 + Math.random() * 8,
      rotation: Math.random() * 360,
      delay: Math.random() * 0.5,
    }));
    setParticles(generated);
  }, [open]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Confetti particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute pointer-events-none"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                rotate: p.rotation,
              }}
              initial={{ y: 0, opacity: 1, scale: 1 }}
              animate={{
                y: [0, 300 + Math.random() * 200],
                opacity: [1, 1, 0],
                scale: [1, 0.8, 0.4],
                rotate: p.rotation + 720,
              }}
              transition={{
                duration: 1.5 + Math.random() * 1.5,
                delay: p.delay,
                ease: 'easeOut',
              }}
            />
          ))}

          <motion.div
            className="relative bg-card border rounded-2xl p-8 max-w-sm w-[90%] text-center shadow-2xl"
            initial={{ scale: 0.5, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          >
            <div className="flex justify-center mb-4">
              <motion.div
                className="size-20 rounded-full bg-cyan-500/10 flex items-center justify-center"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Star className="size-10 text-cyan-500" />
              </motion.div>
            </div>
            <h2 className="text-2xl font-extrabold text-foreground mb-1">
              Chúc mừng!
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              Bạn đã lên cấp
            </p>
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-lg text-muted-foreground line-through">
                Lv. {prevLevel}
              </span>
              <Sparkles className="size-5 text-amber-500" />
              <span className="text-3xl font-extrabold text-cyan-600">
                Lv. {newLevel}
              </span>
            </div>
            <Button onClick={handleClose} className="w-full gap-2">
              <Sparkles className="size-4" />
              Tiếp tục
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
