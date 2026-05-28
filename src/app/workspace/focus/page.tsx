'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
  VideoOff,
  CheckCircle2,
  Circle,
  Eye,
  AlertTriangle,
  Award,
  Zap,
} from 'lucide-react';
import { Sidebar } from '@/components/home/Sidebar';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { calculateFaceMetrics, FaceMetrics } from '@/lib/faceGeometry';
import { LevelUpModal } from '@/components/study/LevelUpModal';

// Kiểu dữ liệu Todo
interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export default function ZenFocusPage() {
  const router = useRouter();
  const { data: session, update } = useSession();

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

  // ─── Trạng thái AI Vision Focus Tracking ───────────────────────────
  const [isMpLoaded, setMpLoaded] = useState(false);
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isModelFocused, setIsModelFocused] = useState<boolean | null>(null);
  const [focusConfidence, setFocusConfidence] = useState<number>(0);
  const [currentMetrics, setCurrentMetrics] = useState<FaceMetrics | null>(null);
  const [accumulatedXp, setAccumulatedXp] = useState(0);
  const [landmarksBuffer, setLandmarksBuffer] = useState<number[][]>([]);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  // Floating indicator cho XP bay lên
  const [xpFloater, setXpFloater] = useState<{ id: number; text: string; isPositive: boolean } | null>(null);

  // Modal hoàn thành và Level Up
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completeStats, setCompleteStats] = useState<any>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [prevLevel, setPrevLevel] = useState(1);
  const [newLevel, setNewLevel] = useState(1);

  // Refs camera và MediaPipe
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const faceMeshRef = useRef<any>(null);
  const mpCameraRef = useRef<any>(null);
  const landmarksBufferRef = useRef<number[][]>([]);

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

  // ─── Tải thư viện MediaPipe từ CDN động ────────────────────────────
  useEffect(() => {
    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.onload = () => resolve();
        script.onerror = () => reject();
        document.head.appendChild(script);
      });
    };

    Promise.all([
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'),
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js'),
    ])
      .then(() => {
        console.log('[FocusAI] MediaPipe FaceMesh scripts loaded.');
        setMpLoaded(true);
      })
      .catch((err) => {
        console.error('[FocusAI] MediaPipe scripts failed to load:', err);
        setTrackingError('Không thể tải các mô hình tracking khuôn mặt từ máy chủ. Vui lòng tải lại trang.');
      });
  }, []);

  // ─── Bộ khởi động camera và FaceMesh khi Bật Tracking ──────────────
  useEffect(() => {
    let activeCamera: any = null;
    let activeFaceMesh: any = null;

    const initTracking = async () => {
      if (!isTrackingEnabled || !isMpLoaded || !videoRef.current) return;

      try {
        setTrackingError(null);

        // Khởi tạo đối tượng FaceMesh
        const faceMesh = new (window as any).FaceMesh({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMesh.onResults((results: any) => {
          if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            const metrics = calculateFaceMetrics(landmarks);
            setCurrentMetrics(metrics);

            // Cập nhật landmarks buffer (trượt lấy 10 frames gần nhất)
            setLandmarksBuffer((prev) => {
              const currentFrame = [metrics.ear, metrics.mar, metrics.pitch, metrics.yaw, metrics.roll];
              const newBuffer = [...prev, currentFrame];
              if (newBuffer.length > 10) {
                newBuffer.shift();
              }
              landmarksBufferRef.current = newBuffer;
              return newBuffer;
            });
          } else {
            // Không tìm thấy khuôn mặt! Thêm các giá trị mất tập trung cực hạn để AI phát hiện ngay lập tức
            setLandmarksBuffer((prev) => {
              const currentFrame = [0.0, 0.0, 90.0, 90.0, 90.0];
              const newBuffer = [...prev, currentFrame];
              if (newBuffer.length > 10) {
                newBuffer.shift();
              }
              landmarksBufferRef.current = newBuffer;
              return newBuffer;
            });
            setCurrentMetrics({ ear: 0.0, mar: 0.0, pitch: 90.0, yaw: 90.0, roll: 90.0 });
          }
        });

        activeFaceMesh = faceMesh;
        faceMeshRef.current = faceMesh;

        // Khởi động Camera và gán cho FaceMesh xử lý
        const camera = new (window as any).Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && faceMeshRef.current && isTrackingEnabled) {
              try {
                await faceMeshRef.current.send({ image: videoRef.current });
              } catch (e) {
                console.warn('[FocusAI] Ignored frame send on close:', e);
              }
            }
          },
          width: 320,
          height: 240,
        });

        await camera.start();
        activeCamera = camera;
        mpCameraRef.current = camera;
        setIsCameraActive(true);
        console.log('[FocusAI] Webcam tracking loop started.');
      } catch (err: any) {
        console.error('[FocusAI] Camera setup failed:', err);
        setTrackingError(err.message || 'Không thể truy cập camera. Vui lòng cấp quyền camera trong trình duyệt.');
        setIsTrackingEnabled(false);
      }
    };

    initTracking();

    return () => {
      // 1. Stop camera first to suspend any new frame requests
      if (activeCamera) {
        try {
          activeCamera.stop();
        } catch (e) {}
      }

      // 2. Null out the ref so lingering onFrame callbacks exit immediately
      faceMeshRef.current = null;

      // 3. Safely close faceMesh
      if (activeFaceMesh) {
        try {
          activeFaceMesh.close();
        } catch (e) {}
      }

      setIsCameraActive(false);
      setIsModelFocused(null);
      setFocusConfidence(0);
      setCurrentMetrics(null);
    };
  }, [isTrackingEnabled, isMpLoaded]);

  // ─── Vòng lặp gửi dữ liệu nhận diện tập trung định kỳ 5 giây ────────
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && mode === 'work' && isTrackingEnabled) {
      interval = setInterval(async () => {
        const currentBuffer = landmarksBufferRef.current;
        if (currentBuffer.length < 10) return; // Đợi đủ 10 frames

        try {
          const res = await fetch('/api/python/api/workspace/focus/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sequence: currentBuffer }),
          });

          if (res.ok) {
            const data = await res.json();
            setIsModelFocused(data.focused);
            setFocusConfidence(data.confidence);

            // Tích lũy EXP cục bộ (+1 tập trung, -2 xao nhãng)
            const xpDiff = data.focused ? 1 : -2;
            setAccumulatedXp((prev) => prev + xpDiff);

            // Hiển thị hiệu ứng chữ EXP bay lên
            setXpFloater({
              id: Date.now(),
              text: xpDiff > 0 ? `+${xpDiff} XP` : `${xpDiff} XP`,
              isPositive: xpDiff > 0,
            });
          } else {
            const errData = await res.json();
            console.warn('[FocusAI] Tracking API error:', errData.detail);
            setTrackingError(errData.detail || 'Mô hình vision gặp lỗi trên Backend.');
            setIsTrackingEnabled(false); // Stop tracking loop
          }
        } catch (err) {
          console.error('[FocusAI] Tracking interval failed:', err);
          setTrackingError('Không thể kết nối tới Backend. Vui lòng kiểm tra dịch vụ.');
          setIsTrackingEnabled(false); // Stop tracking loop
        }
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, mode, isTrackingEnabled]);

  // ─── Xử lý Hoàn thành phiên Pomodoro học tập ──────────────────────
  const handleFocusSessionComplete = async () => {
    setIsRunning(false);
    setIsTrackingEnabled(false);

    const uid = session?.user?.id || 'guest';
    try {
      const res = await fetch('/api/python/api/workspace/focus/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: uid,
          xp_change: accumulatedXp,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCompleteStats(data);
        setShowCompleteDialog(true);

        // Đồng bộ dữ liệu session NextAuth để cập nhật XP/Level lên Sidebar ngay lập tức
        if (update && uid !== 'guest') {
          await update({
            xpPoints: data.total_xp,
            currentLevel: data.current_level,
          });
        }

        // Kích hoạt CONFETTI và modal LevelUp nếu có lên cấp
        if (data.levels_gained > 0) {
          setPrevLevel(data.current_level - data.levels_gained);
          setNewLevel(data.current_level);
          setShowLevelUp(true);
        }
      }
    } catch (err) {
      console.error('[FocusAI] Completion API error:', err);
      // Fallback hiển thị thông báo offline
      setCompleteStats({
        xp_gained: Math.max(accumulatedXp, 0),
        xp_lost: Math.abs(Math.min(accumulatedXp, 0)),
        total_xp: Math.max(accumulatedXp, 0),
        current_level: 1,
        levels_gained: 0,
        next_level_xp: 100,
      });
      setShowCompleteDialog(true);
    }
  };

  // ─── Bộ đếm ngược Pomodoro ─────────────────────────────────────────
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      playAlertSound();
      
      // Nếu hoàn thành phiên HỌC TẬP (work) thành công
      if (mode === 'work') {
        handleFocusSessionComplete();
      } else {
        handleSkip();
      }
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
    setAccumulatedXp(0);
    setLandmarksBuffer([]);
  };

  const handleSkip = () => {
    setIsRunning(false);
    setLandmarksBuffer([]);
    if (mode === 'work') {
      setMode('shortBreak');
      setDuration(5 * 60);
      setTimeLeft(5 * 60);
    } else {
      setMode('work');
      setDuration(25 * 60);
      setTimeLeft(25 * 60);
    }
  };

  const selectTimerPreset = (presetMode: 'work' | 'deepWork' | 'shortBreak' | 'longBreak') => {
    setIsRunning(false);
    setAccumulatedXp(0);
    setLandmarksBuffer([]);
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

  const startRain = () => {
    initAudioCtx();
    const ctx = audioCtxRef.current!;
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, ctx.currentTime);

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

  const startWind = () => {
    initAudioCtx();
    const ctx = audioCtxRef.current!;
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.5, ctx.currentTime);
    filter.frequency.setValueAtTime(400, ctx.currentTime);

    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.12, ctx.currentTime);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(200, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, ctx.currentTime);

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
    if (isRainOn) stopRain();
    else startRain();
    setIsRainOn(!isRainOn);
  };

  const handleToggleWind = () => {
    if (isWindOn) stopWind();
    else startWind();
    setIsWindOn(!isWindOn);
  };

  useEffect(() => {
    return () => {
      stopRain();
      stopWind();
      if (audioCtxRef.current) audioCtxRef.current.close();
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
        
        {/* Aurora Glow background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 dark:bg-primary/5 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#A29BFE]/5 dark:bg-[#A29BFE]/3 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
        </div>

        {/* Sidebar */}
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
            
            {/* Left Box: Pomodoro Circular Timer */}
            <div className={`flex flex-col items-center justify-center transition-all duration-500 ${isZenMode ? 'lg:col-span-12' : 'lg:col-span-5'}`}>
              
              {/* Presets Selector */}
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
                
                {/* Real-time Floating XP Text */}
                <AnimatePresence>
                  {xpFloater && (
                    <motion.span
                      key={xpFloater.id}
                      initial={{ opacity: 0, y: 15, scale: 0.8 }}
                      animate={{ opacity: 1, y: -45, scale: 1.2 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className={`absolute z-30 text-sm font-black tracking-wider ${
                        xpFloater.isPositive ? 'text-cyan-400 drop-shadow-[0_0_8px_#22d3ee]' : 'text-red-500 drop-shadow-[0_0_8px_#ef4444]'
                      }`}
                      style={{ top: '15%' }}
                    >
                      {xpFloater.text}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* SVG Ring Progress */}
                <svg className="absolute size-72 md:size-80 transform -rotate-90 pointer-events-none">
                  <circle
                    cx={160}
                    cy={160}
                    r={radius}
                    className="stroke-muted-foreground/10 dark:stroke-white/[0.03]"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />
                  <motion.circle
                    cx={160}
                    cy={160}
                    r={radius}
                    className={`transition-all duration-300 ${mode === 'work'
                        ? isModelFocused === false ? 'stroke-red-500' : 'stroke-primary dark:stroke-[#A29BFE]'
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
                        ? isModelFocused === false
                          ? 'drop-shadow(0 0 10px rgba(239,68,68,0.6))'
                          : 'drop-shadow(0 0 8px rgba(108,92,231,0.5))'
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
                  <span className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1.5">
                    {mode === 'work' ? (
                      isModelFocused === false ? (
                        <span className="text-red-500 animate-pulse font-semibold">⚠️ Cảnh báo: Mất tập trung!</span>
                      ) : (
                        <span>🎯 Giữ tập trung</span>
                      )
                    ) : (
                      <span>☕ Thư giãn đầu óc</span>
                    )}
                  </span>
                  
                  {/* EXP Session tracker in Zen Mode */}
                  {isZenMode && mode === 'work' && isTrackingEnabled && (
                    <span className="text-[11px] text-cyan-400 font-bold mt-2 animate-pulse">
                      Tích lũy: {accumulatedXp > 0 ? `+${accumulatedXp}` : accumulatedXp} XP
                    </span>
                  )}
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

            {/* Right Box: Dynamic Config & Ambient Sound & AI Webcam HUD */}
            <AnimatePresence>
              {!isZenMode && (
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ duration: 0.4 }}
                  className="lg:col-span-7 flex flex-col gap-6 w-full"
                >
                  
                  {/* AI VISION FOCUS TRACKER HUD PANEL */}
                  <div className={`rounded-2xl border bg-card/45 p-5 backdrop-blur-md relative overflow-hidden flex flex-col gap-4 shadow-lg transition-all duration-300 ${
                    isTrackingEnabled
                      ? isModelFocused === null
                        ? 'border-cyan-400/40 shadow-cyan-400/5'
                        : isModelFocused
                          ? 'border-emerald-500/40 shadow-emerald-500/5'
                          : 'border-red-500/50 shadow-red-500/10'
                      : 'border-border/40'
                  }`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-black flex items-center gap-2">
                        <Eye className={`size-4 ${isTrackingEnabled ? 'text-cyan-400 animate-pulse' : ''}`} />
                        Hệ Thống Theo Dõi Tập Trung (AI Focus HUD)
                      </h3>
                      
                      {/* Live indicator tag */}
                      {isTrackingEnabled && (
                        <span className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                          isModelFocused === null
                            ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 animate-pulse'
                            : isModelFocused
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/10 border-red-500/20 text-red-500 animate-bounce'
                        }`}>
                          <span className={`size-1.5 rounded-full ${
                            isModelFocused === null ? 'bg-cyan-400 animate-ping' : isModelFocused ? 'bg-emerald-400' : 'bg-red-500'
                          }`} />
                          {isModelFocused === null ? 'Đang trích xuất...' : isModelFocused ? 'Đang tập trung' : 'Mất tập trung!'}
                        </span>
                      )}
                    </div>

                    {/* Camera View Box */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                      
                      {/* Video Stream Feed */}
                      <div className={`relative rounded-xl overflow-hidden border bg-black/40 min-h-[150px] aspect-video flex items-center justify-center transition-all duration-300 ${
                        isTrackingEnabled
                          ? isModelFocused === null
                            ? 'border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                            : isModelFocused
                              ? 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                              : 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse'
                          : 'border-border/30'
                      }`}>
                        
                        {/* Hidden/Active HTML Video element */}
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-500 ${
                            isCameraActive ? 'opacity-90' : 'opacity-0 absolute pointer-events-none'
                          }`}
                        />

                        {/* Scanner Laser effect */}
                        {isTrackingEnabled && isCameraActive && (
                          <motion.div
                            initial={{ top: '0%' }}
                            animate={{ top: '95%' }}
                            transition={{ repeat: Infinity, repeatType: 'reverse', duration: 2.5, ease: 'linear' }}
                            className="absolute inset-x-0 h-0.5 bg-cyan-400/60 shadow-[0_0_8px_rgba(34,211,238,0.8)] pointer-events-none z-20"
                          />
                        )}

                        {/* Camera off placeholder */}
                        {!isCameraActive && (
                          <div className="flex flex-col items-center gap-2 text-muted-foreground/60 text-xs p-4 text-center">
                            {isTrackingEnabled ? (
                              <>
                                <div className="size-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent mb-1" />
                                <span>Đang kết nối camera & nạp Face Mesh...</span>
                              </>
                            ) : (
                              <>
                                <VideoOff className="size-8 text-muted-foreground/40 mb-1" />
                                <span>Camera đang tắt. Hãy bật camera để bắt đầu đo lường điểm tập trung & cộng dồn EXP.</span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Overlay Face indicator bounds */}
                        {isTrackingEnabled && isCameraActive && (
                          <div className={`absolute inset-6 border-2 rounded-lg pointer-events-none transition-colors duration-300 z-10 ${
                            isModelFocused === null
                              ? 'border-cyan-400/20'
                              : isModelFocused
                                ? 'border-emerald-500/30'
                                : 'border-red-500/50 animate-pulse'
                          }`} />
                        )}
                      </div>

                      {/* Live Data Dashboard */}
                      <div className="flex flex-col justify-between text-xs py-1">
                        
                        {/* Error display */}
                        {trackingError ? (
                          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl flex items-start gap-2 select-none">
                            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                            <p className="text-[10px] leading-relaxed">{trackingError}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-center border-b border-border/40 pb-1.5">
                              <span className="text-muted-foreground font-bold">Chỉ số tập trung tích lũy:</span>
                              <span className={`font-black ${accumulatedXp >= 0 ? 'text-cyan-400' : 'text-red-500 animate-pulse'}`}>
                                {accumulatedXp > 0 ? `+${accumulatedXp}` : accumulatedXp} EXP
                              </span>
                            </div>

                            {/* Mathematical outputs */}
                            {currentMetrics ? (
                              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-muted-foreground bg-black/10 dark:bg-black/30 p-2.5 rounded-xl border border-border/30">
                                <div>👁️ EAR: <span className="text-foreground font-bold">{currentMetrics.ear.toFixed(3)}</span></div>
                                <div>👄 MAR: <span className="text-foreground font-bold">{currentMetrics.mar.toFixed(3)}</span></div>
                                <div>↕️ Pitch: <span className="text-foreground font-bold">{currentMetrics.pitch.toFixed(1)}°</span></div>
                                <div>↔️ Yaw: <span className="text-foreground font-bold">{currentMetrics.yaw.toFixed(1)}°</span></div>
                                <div className="col-span-2">🔄 Roll: <span className="text-foreground font-bold">{currentMetrics.roll.toFixed(1)}°</span></div>
                              </div>
                            ) : (
                              <p className="text-[10px] text-muted-foreground/75 italic leading-relaxed">
                                Đang chờ trích xuất các đặc trưng EAR (độ mở mắt), MAR (độ mở miệng), Head Pose (góc nghiêng mặt) qua MediaPipe Face Mesh...
                              </p>
                            )}

                            {isTrackingEnabled && isModelFocused !== null && (
                              <div className="flex items-center gap-2 mt-1 select-none">
                                <Zap className="size-4 text-cyan-400 fill-cyan-400/20" />
                                <span className="text-[10px] text-muted-foreground">
                                  Độ tin cậy mô hình LSTM: <span className="text-foreground font-bold">{(focusConfidence * 100).toFixed(1)}%</span>
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Camera Toggle Button */}
                        <div className="flex gap-2 mt-4 md:mt-0">
                          <Button
                            type="button"
                            onClick={() => setIsTrackingEnabled(!isTrackingEnabled)}
                            className={`flex-1 text-xs font-bold py-2 rounded-xl border transition-all ${
                              isTrackingEnabled
                                ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-500'
                                : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-500'
                            }`}
                          >
                            {isTrackingEnabled ? (
                              <>
                                <VideoOff className="size-3.5 mr-1.5" />
                                Tắt Camera AI
                              </>
                            ) : (
                              <>
                                <Video className="size-3.5 mr-1.5" />
                                Bật Camera AI
                              </>
                            )}
                          </Button>
                        </div>

                      </div>
                    </div>
                  </div>

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

                  {/* Box 2: Focus Goals */}
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

          <div className="text-center text-[10px] text-muted-foreground/70 select-none pb-2 mt-4">
            Zen Focus Space sử dụng Web Audio API để tái tạo sóng tiếng ồn tự nhiên ngoại tuyến. Mọi dữ liệu mục tiêu được lưu an toàn trên máy của bạn.
          </div>

        </main>
      </div>

      {/* ─── MODAL KẾT THÚC PHIÊN HỌC TẬP (AI SUMMARY VIEW) ────────────────── */}
      <AnimatePresence>
        {showCompleteDialog && completeStats && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border/40 p-8 rounded-3xl max-w-md w-full shadow-2xl relative text-center mx-4"
            >
              <div className="size-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4 text-cyan-400">
                <Award className="size-8" />
              </div>

              <h2 className="text-2xl font-black tracking-tight text-foreground mb-1">
                Hoàn Thành Phiên Tập Trung!
              </h2>
              <p className="text-xs text-muted-foreground mb-6">
                Chúc mừng bạn đã kết thúc trọn vẹn thời lượng Pomodoro của mình.
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-black/10 dark:bg-black/20 p-4 rounded-2xl border border-border/30">
                  <span className="text-[10px] text-muted-foreground block mb-1">XP TÍCH LŨY</span>
                  <span className="text-xl font-black text-cyan-400">
                    +{completeStats.xp_gained} XP
                  </span>
                </div>
                <div className="bg-black/10 dark:bg-black/20 p-4 rounded-2xl border border-border/30">
                  <span className="text-[10px] text-muted-foreground block mb-1">HÌNH PHẠT XAO NHÃNG</span>
                  <span className="text-xl font-black text-red-500">
                    -{completeStats.xp_lost} XP
                  </span>
                </div>
              </div>

              {/* Progress Bar update */}
              <div className="mb-6 text-left">
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="text-muted-foreground">Cấp độ {completeStats.current_level}</span>
                  <span className="font-bold text-foreground">
                    {completeStats.total_xp} / {completeStats.next_level_xp} XP
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-500"
                    style={{ width: `${Math.min((completeStats.total_xp / completeStats.next_level_xp) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <Button
                onClick={() => {
                  setShowCompleteDialog(false);
                  handleSkip(); // Chuyển sang phiên nghỉ ngơi
                }}
                className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-2xl"
              >
                Tuyệt vời, Bắt đầu nghỉ ngơi!
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LevelUpModal Gamification Overlay */}
      {showLevelUp && (
        <LevelUpModal
          prevLevel={prevLevel}
          newLevel={newLevel}
          onClose={() => setShowLevelUp(false)}
        />
      )}
    </TooltipProvider>
  );
}
