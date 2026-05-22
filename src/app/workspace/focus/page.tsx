'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Music,
  Video,
  CheckCircle2,
  Circle,
  HelpCircle,
} from 'lucide-react';
import { Sidebar } from '@/components/home/Sidebar';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

// Kiểu dữ liệu Todo
interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export default function ZenFocusPage() {
  const router = useRouter();

  // ─── Trạng thái Pomodoro ──────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 phút mặc định
  const [duration, setDuration] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'shortBreak' | 'longBreak'>('work');

  // ─── Trạng thái Zen Mode (Tập trung tuyệt đối) ─────────────────────
  const [isZenMode, setIsZenMode] = useState(false);

  // ─── Trạng thái YouTube Lofi Player ────────────────────────────────
  const [youtubeUrl, setYoutubeUrl] = useState('https://www.youtube.com/embed/EWrX250Zhko'); // Live Lofi Girl mặc định
  const [customYtInput, setCustomYtInput] = useState('');
  const [showYtConfig, setShowYtConfig] = useState(false);

  // ─── Trạng thái Todo List ──────────────────────────────────────────
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodoText, setNewTodoText] = useState('');

  // ─── Trạng thái Âm thanh nền (Rain & Wind Generator) ─────────────────
  const [isRainOn, setIsRainOn] = useState(false);
  const [isWindOn, setIsWindOn] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rainNodeRef = useRef<AudioNode | null>(null);
  const windNodeRef = useRef<AudioNode | null>(null);
  const rainGainRef = useRef<GainNode | null>(null);
  const windGainRef = useRef<GainNode | null>(null);

  // Tự động tải Todo từ LocalStorage khi component mount
  useEffect(() => {
    const savedTodos = localStorage.getItem('zen_focus_todos');
    if (savedTodos) {
      try {
        setTodos(JSON.parse(savedTodos));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Tự động lưu Todo vào LocalStorage khi danh sách thay đổi
  const saveTodos = (newTodos: TodoItem[]) => {
    setTodos(newTodos);
    localStorage.setItem('zen_focus_todos', JSON.stringify(newTodos));
  };

  // ─── Bộ đếm ngược Pomodoro ─────────────────────────────────────────
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      // Đã đếm ngược xong
      setIsRunning(false);
      // Phát âm thanh báo hiệu nhẹ nhàng
      playAlertSound();
      handleSkip(); // Tự động chuyển mode hoặc dừng lại
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, timeLeft]);

  // Âm thanh báo hiệu hoàn thành Pomodoro (sử dụng Web Audio API)
  const playAlertSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (e) {
      console.warn("Không thể phát âm thanh báo hiệu:", e);
    }
  };

  const handleStartPause = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(duration);
  };

  const handleSkip = () => {
    setIsRunning(false);
    if (mode === 'work') {
      // Học xong chuyển sang nghỉ ngắn
      setMode('shortBreak');
      setDuration(5 * 60);
      setTimeLeft(5 * 60);
    } else {
      // Nghỉ xong chuyển sang học
      setMode('work');
      setDuration(25 * 60);
      setTimeLeft(25 * 60);
    }
  };

  const selectTimerPreset = (presetMode: 'work' | 'deepWork' | 'shortBreak' | 'longBreak') => {
    setIsRunning(false);
    if (presetMode === 'work') {
      setMode('work');
      setDuration(25 * 60);
      setTimeLeft(25 * 60);
    } else if (presetMode === 'deepWork') {
      setMode('work');
      setDuration(50 * 60);
      setTimeLeft(50 * 60);
    } else if (presetMode === 'shortBreak') {
      setMode('shortBreak');
      setDuration(5 * 60);
      setTimeLeft(5 * 60);
    } else if (presetMode === 'longBreak') {
      setMode('longBreak');
      setDuration(15 * 60);
      setTimeLeft(15 * 60);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Tính toán chu vi của đường tròn để vẽ viền SVG đếm ngược
  const radius = 110;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / duration;
  const strokeDashoffset = circumference * (1 - progress);

  // ─── Web Audio API Âm thanh môi trường giả lập (Tiếng Mưa & Tiếng Gió) ───
  const initAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  // Tạo nguồn Tiếng Mưa (White Noise + Lowpass Filter)
  const startRain = () => {
    initAudioCtx();
    const ctx = audioCtxRef.current!;
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Điền White noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Filter làm mịn tiếng ồn để nghe giống tiếng mưa rơi
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, ctx.currentTime); // Âm lượng mưa nhỏ nhẹ nhàng

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start();

    rainNodeRef.current = source;
    rainGainRef.current = gain;
  };

  const stopRain = () => {
    if (rainNodeRef.current) {
      try {
        (rainNodeRef.current as AudioBufferSourceNode).stop();
      } catch (e) { }
      rainNodeRef.current = null;
    }
  };

  // Tạo nguồn Tiếng Gió (Brown Noise + Bandpass Filter có LFO tự động thay đổi tần số)
  const startWind = () => {
    initAudioCtx();
    const ctx = audioCtxRef.current!;
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Sinh Brown Noise (tích lũy tiếng ồn để tạo âm thanh trầm ấm)
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Khuếch đại một chút vì Brown Noise bị suy giảm
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Bandpass Filter lọc dải tần số tạo cảm giác tiếng gió rít qua khe cửa
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.5, ctx.currentTime);
    filter.frequency.setValueAtTime(400, ctx.currentTime);

    // Dùng LFO (Oscillator tần số thấp) để làm tiếng gió tự động rì rào lúc to lúc nhỏ
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // Lực thổi thay đổi rất chậm (khoảng 8 giây một chu kỳ)

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(200, ctx.currentTime); // Biên độ dao động tần số lọc

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency); // Điều biến tần số của bandpass filter
    lfo.start();

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, ctx.currentTime); // Âm lượng gió

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start();

    windNodeRef.current = source;
    windGainRef.current = gain;
  };

  const stopWind = () => {
    if (windNodeRef.current) {
      try {
        (windNodeRef.current as AudioBufferSourceNode).stop();
      } catch (e) { }
      windNodeRef.current = null;
    }
  };

  const handleToggleRain = () => {
    if (isRainOn) {
      stopRain();
    } else {
      startRain();
    }
    setIsRainOn(!isRainOn);
  };

  const handleToggleWind = () => {
    if (isWindOn) {
      stopWind();
    } else {
      startWind();
    }
    setIsWindOn(!isWindOn);
  };

  // Tắt toàn bộ âm thanh khi unmount trang
  useEffect(() => {
    return () => {
      stopRain();
      stopWind();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // ─── Xử lý Todo List ──────────────────────────────────────────────
  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;

    const newTodo: TodoItem = {
      id: Math.random().toString(36).substring(2, 9),
      text: newTodoText.trim(),
      completed: false,
    };

    const updated = [...todos, newTodo];
    saveTodos(updated);
    setNewTodoText('');
  };

  const handleToggleTodo = (id: string) => {
    const updated = todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    saveTodos(updated);
  };

  const handleDeleteTodo = (id: string) => {
    const updated = todos.filter((t) => t.id !== id);
    saveTodos(updated);
  };

  // ─── Xử lý đổi link YouTube ──────────────────────────────────────
  const handleCustomYoutubeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customYtInput.trim()) return;

    let embedUrl = customYtInput.trim();
    // Chuyển đổi link youtube thông thường sang dạng embed
    if (embedUrl.includes('youtube.com/watch?v=')) {
      const videoId = embedUrl.split('v=')[1]?.split('&')[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (embedUrl.includes('youtu.be/')) {
      const videoId = embedUrl.split('youtu.be/')[1]?.split('?')[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    }

    setYoutubeUrl(embedUrl);
    setShowYtConfig(false);
    setCustomYtInput('');
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-transparent text-foreground font-sans relative">

        {/* Glow Aurora Background - Isolated to prevent parent auto-scrolling */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 dark:bg-primary/5 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#A29BFE]/5 dark:bg-[#A29BFE]/3 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
        </div>

        {/* Sidebar (Có thể ẩn khi bật Zen Mode để loại bỏ xao nhãng) */}
        <AnimatePresence>
          {!isZenMode && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
              className="h-full shrink-0 overflow-hidden"
            >
              <Sidebar collapsed={false} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Workspace Area */}
        <main className="flex-1 overflow-y-auto px-6 py-6 md:px-10 flex flex-col justify-between relative z-10 transition-all duration-300">

          {/* Top Header */}
          <div className="flex items-center justify-between w-full border-b border-border/40 pb-4">
            <div className="flex items-center gap-4">
              {!isZenMode && (
                <button
                  onClick={() => router.push('/workspace')}
                  className="flex size-9 items-center justify-center rounded-xl border border-border/40 bg-card hover:bg-accent/15 transition-all text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="size-4" />
                </button>
              )}
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>Zen Focus Space</span>
                  <span className="size-2 rounded-full bg-primary animate-pulse" />
                </h1>
                {!isZenMode && <p className="text-xs text-muted-foreground">Thiết lập sự yên tĩnh tuyệt đối cho riêng mình</p>}
              </div>
            </div>

            {/* Zen Mode Switch Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsZenMode(!isZenMode)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-semibold bg-card hover:bg-accent/15 ${isZenMode
                      ? 'border-primary/50 bg-primary/20 text-primary-foreground shadow-[0_0_15px_rgba(108,92,231,0.3)] animate-pulse'
                      : 'border-border/40 text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {isZenMode ? (
                    <>
                      <Minimize2 className="size-4" />
                      <span>Thoát Zen Mode</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="size-4 animate-pulse" />
                      <span>Zen Mode (Ẩn hết)</span>
                    </>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent className="glass-sheet border-border/40 text-foreground">
                Ẩn Sidebar & Header để loại bỏ 100% xao nhãng xung quanh.
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Central Workspace Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto py-6 items-center w-full max-w-7xl mx-auto">

            {/* Left Box: Pomodoro Circular Timer (Takes 5 cols or 12 cols in Zen Mode) */}
            <div className={`flex flex-col items-center justify-center transition-all duration-500 ${isZenMode ? 'lg:col-span-12' : 'lg:col-span-5'}`}>

              {/* Presets Selector (Hidden in Zen Mode to prevent clutter) */}
              {!isZenMode && (
                <div className="flex flex-wrap gap-2 justify-center mb-6 max-w-sm">
                  <button
                    onClick={() => selectTimerPreset('work')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${mode === 'work' && duration === 25 * 60
                        ? 'bg-primary/20 border-primary/50 text-primary shadow-[0_0_10px_rgba(108,92,231,0.2)]'
                        : 'bg-card border-border/40 text-muted-foreground hover:text-foreground hover:bg-accent/10'
                      }`}
                  >
                    🎯 Học (25m)
                  </button>
                  <button
                    onClick={() => selectTimerPreset('deepWork')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${mode === 'work' && duration === 50 * 60
                        ? 'bg-primary/20 border-primary/50 text-primary shadow-[0_0_10px_rgba(108,92,231,0.2)]'
                        : 'bg-card border-border/40 text-muted-foreground hover:text-foreground hover:bg-accent/10'
                      }`}
                  >
                    🔥 Học sâu (50m)
                  </button>
                  <button
                    onClick={() => selectTimerPreset('shortBreak')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${mode === 'shortBreak'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                        : 'bg-card border-border/40 text-muted-foreground hover:text-foreground hover:bg-accent/10'
                      }`}
                  >
                    ☕ Nghỉ ngắn (5m)
                  </button>
                  <button
                    onClick={() => selectTimerPreset('longBreak')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${mode === 'longBreak'
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-600 dark:text-cyan-400'
                        : 'bg-card border-border/40 text-muted-foreground hover:text-foreground hover:bg-accent/10'
                      }`}
                  >
                    🌊 Nghỉ dài (15m)
                  </button>
                </div>
              )}

              {/* Circular LED Neon Timer */}
              <div className="relative flex items-center justify-center size-72 md:size-80 rounded-full border border-border/40 bg-card/45 backdrop-blur-md shadow-sm">

                {/* SVG Ring Progress */}
                <svg className="absolute size-72 md:size-80 transform -rotate-90 pointer-events-none">
                  {/* Background Circle */}
                  <circle
                    cx={160}
                    cy={160}
                    r={radius}
                    className="stroke-muted-foreground/10 dark:stroke-white/[0.03]"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />
                  {/* LED Neon Progress Circle */}
                  <motion.circle
                    cx={160}
                    cy={160}
                    r={radius}
                    className={`transition-all duration-300 ${mode === 'work'
                        ? 'stroke-primary dark:stroke-[#A29BFE]'
                        : 'stroke-emerald-400'
                      }`}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 0.5, ease: 'linear' }}
                    strokeLinecap="round"
                    style={{
                      filter: mode === 'work'
                        ? 'drop-shadow(0 0 8px rgba(108,92,231,0.5))'
                        : 'drop-shadow(0 0 8px rgba(52,211,153,0.5))'
                    }}
                  />
                </svg>

                {/* Inner Content */}
                <div className="z-10 flex flex-col items-center">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">
                    {mode === 'work' ? 'Đang học tập' : 'Đang nghỉ ngơi'}
                  </span>
                  <span className="text-5xl md:text-6xl font-black font-mono tracking-tight text-foreground select-none">
                    {formatTime(timeLeft)}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-2">
                    {mode === 'work' ? '🎯 Giữ tập trung' : '☕ Thư giãn đầu óc'}
                  </span>
                </div>
              </div>

              {/* Timer Controls */}
              <div className="flex items-center gap-4 mt-8">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleReset}
                      className="flex size-11 items-center justify-center rounded-full border border-border/40 bg-card text-muted-foreground hover:text-foreground transition-all hover:scale-105 active:scale-95"
                    >
                      <RotateCcw className="size-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="glass-sheet border-border/40 text-foreground">Đặt lại thời gian</TooltipContent>
                </Tooltip>

                <button
                  onClick={handleStartPause}
                  className={`flex size-16 items-center justify-center rounded-full text-primary-foreground transition-all hover:scale-105 active:scale-95 shadow-lg ${isRunning
                      ? 'bg-red-500/85 hover:bg-red-500 shadow-red-500/20'
                      : mode === 'work'
                        ? 'bg-primary hover:bg-primary/95 shadow-primary/20'
                        : 'bg-emerald-500 hover:bg-emerald-500/95 shadow-emerald-500/20'
                    }`}
                >
                  {isRunning ? <Pause className="size-7 fill-white" /> : <Play className="size-7 fill-white ml-1" />}
                </button>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleSkip}
                      className="flex size-11 items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-all hover:scale-105 active:scale-95"
                    >
                      <SkipForward className="size-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="glass-sheet border-border/40 text-foreground">Bỏ qua phiên này</TooltipContent>
                </Tooltip>
              </div>

            </div>

            {/* Right Box: Dynamic Config & Ambient Sound (Only shown in normal mode to keep clean look in Zen mode) */}
            <AnimatePresence>
              {!isZenMode && (
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ duration: 0.4 }}
                  className="lg:col-span-7 flex flex-col gap-6 w-full"
                >

                  {/* Box 1: YouTube Live Lofi Player & Sound Mixer */}
                  <div className="rounded-2xl border border-border/40 bg-card/45 p-5 backdrop-blur-md relative overflow-hidden flex flex-col md:flex-row gap-5 items-stretch shadow-sm">

                    {/* YouTube Embed Mini Player */}
                    <div className="flex-1 rounded-xl overflow-hidden border border-border/40 bg-black/5 dark:bg-black/40 min-h-[160px] relative group">
                      <iframe
                        src={`${youtubeUrl}?autoplay=1&mute=1&enablejsapi=1`}
                        title="Lofi Music"
                        className="absolute inset-0 w-full h-full object-cover"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />

                      {/* Configuration trigger overlay */}
                      <button
                        onClick={() => setShowYtConfig(!showYtConfig)}
                        className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-lg bg-black/60 hover:bg-black/80 text-white border border-white/10 transition-all z-20"
                      >
                        <Music className="size-3.5" />
                      </button>
                    </div>

                    {/* Ambient Sound Mixer */}
                    <div className="flex flex-col justify-between w-full md:w-56 shrink-0 border-l border-border/40 pl-0 md:pl-5 pt-4 md:pt-0">
                      <div>
                        <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3 flex items-center gap-1.5">
                          <Volume2 className="size-4 text-primary" />
                          Âm thanh môi trường
                        </h3>
                        <p className="text-[11px] text-muted-foreground/75 mb-4">Sử dụng Web Audio để tự động tổng hợp âm thanh thiên nhiên offline cực hay.</p>
                      </div>

                      <div className="flex flex-col gap-3">
                        {/* Rain Generator Toggle */}
                        <button
                          onClick={handleToggleRain}
                          className={`flex items-center justify-between w-full px-4 py-2.5 rounded-xl border transition-all text-xs font-semibold ${isRainOn
                              ? 'bg-primary/15 border-primary/30 text-primary shadow-[0_0_10px_rgba(108,92,231,0.1)]'
                              : 'bg-card border-border/40 text-muted-foreground hover:text-foreground hover:bg-accent/10'
                            }`}
                        >
                          <span className="flex items-center gap-2">
                            ⛈️
                            <span>Tiếng mưa rào</span>
                          </span>
                          {isRainOn ? <Volume2 className="size-3.5 text-emerald-400" /> : <VolumeX className="size-3.5" />}
                        </button>

                        {/* Wind Generator Toggle */}
                        <button
                          onClick={handleToggleWind}
                          className={`flex items-center justify-between w-full px-4 py-2.5 rounded-xl border transition-all text-xs font-semibold ${isWindOn
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                              : 'bg-card border-border/40 text-muted-foreground hover:text-foreground hover:bg-accent/10'
                            }`}
                        >
                          <span className="flex items-center gap-2">
                            💨
                            <span>Tiếng gió rì rào</span>
                          </span>
                          {isWindOn ? <Volume2 className="size-3.5 text-emerald-400" /> : <VolumeX className="size-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* YouTube link customizer modal popup */}
                  <AnimatePresence>
                    {showYtConfig && (
                      <motion.form
                        onSubmit={handleCustomYoutubeSubmit}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="rounded-xl border border-border/80 bg-popover/95 backdrop-blur-xl p-4 flex flex-col gap-3 shadow-2xl relative z-30"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">Cấu hình nhạc YouTube Lofi</span>
                          <button
                            type="button"
                            onClick={() => setShowYtConfig(false)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Đóng
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Dán link YouTube hoặc Livestream bất kỳ..."
                            value={customYtInput}
                            onChange={(e) => setCustomYtInput(e.target.value)}
                            className="flex-1 bg-background/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50"
                          />
                          <Button type="submit" size="sm" className="text-xs bg-primary hover:bg-primary/95 text-white">
                            Áp dụng
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground/70">Mẹo: Bạn có thể dán link MV ca nhạc, Lofi Piano, hoặc bài giảng tiếng Anh yêu thích.</p>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {/* Box 2: Focus Goals (Glassmorphic Todo list) */}
                  <div className="rounded-2xl border border-border/40 bg-card/45 p-5 backdrop-blur-md flex flex-col gap-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="size-4 text-emerald-500" />
                        Mục tiêu học tập phiên này
                      </h3>
                      <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full px-2.5 py-0.5 font-bold">
                        {todos.filter((t) => t.completed).length}/{todos.length} Đã xong
                      </span>
                    </div>

                    {/* Todo Input form */}
                    <form onSubmit={handleAddTodo} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Thêm mục tiêu nhỏ cần hoàn thành..."
                        value={newTodoText}
                        onChange={(e) => setNewTodoText(e.target.value)}
                        className="flex-1 bg-background/50 border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary/40 focus:bg-background/80 transition-all"
                      />
                      <button
                        type="submit"
                        className="flex size-9 items-center justify-center rounded-xl bg-primary dark:bg-[#A29BFE] hover:scale-105 active:scale-95 text-white transition-all"
                      >
                        <Plus className="size-4" />
                      </button>
                    </form>

                    {/* Todo list container */}
                    <div className="max-h-[180px] overflow-y-auto flex flex-col gap-2 pr-1 custom-scrollbar">
                      <AnimatePresence initial={false}>
                        {todos.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground/60 text-xs flex flex-col items-center gap-2">
                            <Circle className="size-6 text-muted-foreground/40 animate-pulse" />
                            <span>Chưa có mục tiêu nào được thiết lập. Hãy gieo hạt mục tiêu đầu tiên!</span>
                          </div>
                        ) : (
                          todos.map((todo) => (
                            <motion.div
                              key={todo.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              className="flex items-center justify-between p-3 rounded-xl border border-border/30 bg-card/20 hover:bg-accent/10 transition-all group"
                            >
                              <div
                                onClick={() => handleToggleTodo(todo.id)}
                                className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                              >
                                {todo.completed ? (
                                  <CheckCircle2 className="size-4.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <Circle className="size-4.5 text-muted-foreground hover:text-foreground shrink-0 transition-colors" />
                                )}
                                <span className={`text-xs truncate ${todo.completed ? 'line-through text-muted-foreground/60' : 'text-foreground'}`}>
                                  {todo.text}
                                </span>
                              </div>

                              <button
                                onClick={() => handleDeleteTodo(todo.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </motion.div>
                          ))
                        )}
                      </AnimatePresence>
                    </div>

                  </div>

                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Bottom simple warning/tips */}
          <div className="text-center text-[10px] text-muted-foreground/70 select-none pb-2 mt-4">
            Zen Focus Space sử dụng Web Audio API để tái tạo sóng tiếng ồn tự nhiên ngoại tuyến. Mọi dữ liệu mục tiêu được lưu an toàn trên máy của bạn.
          </div>

        </main>
      </div>
    </TooltipProvider>
  );
}
