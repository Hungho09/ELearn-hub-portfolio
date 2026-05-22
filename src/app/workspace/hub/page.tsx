'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Send,
  Users,
  MessageSquare,
  Sparkles,
  Flame,
  Award,
  Zap,
  Settings,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Sidebar } from '@/components/home/Sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';

// Định nghĩa kiểu dữ liệu người học
interface Companion {
  id: string; // peerId đối với người học thật
  name: string;
  avatar: string;
  status: string;
  timeStudied: number; // phút
  lastActive?: number; // timestamp hoạt động cuối (cho người học thật)
}

// Định nghĩa kiểu tin nhắn chat
interface ChatMessage {
  id: string;
  sender: string;
  avatar: string;
  text: string;
  timestamp: string;
  isMe: boolean;
}

// Định nghĩa kiểu Emoji bay
interface FloatingEmojiItem {
  id: string;
  emoji: string;
  x: number; // Tọa độ X (phần trăm màn hình, ví dụ 10-90)
  size: number;
}

const EMOJIS = ['❤️', '💪', '✍️', '☕', '🧠', '🔥'];

// Trạng thái học tập mẫu để chọn
const STATUS_OPTIONS = [
  "Đang ghi nhớ từ vựng IELTS 🧠",
  "Đang giải bài tập đại số nâng cao 📐",
  "Đang viết code React component 💻",
  "Đang đọc sách lịch sử khoa học 📖",
  "Đang luyện nghe tiếng Anh giao tiếp 🎧",
  "Đang vẽ phác thảo UI/UX 🎨",
  "Đang ôn tập kiến thức thi cử 🎓",
  "Đang tập trung cao độ 🤫"
];

export default function PublicStudyHubPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // ─── Trạng thái Người dùng ─────────────────────────────────────────
  const [myPeerId] = useState(() => 'user_' + Math.random().toString(36).substring(2, 9));
  const [myName, setMyName] = useState('Học viên');
  const [myAvatar, setMyAvatar] = useState(() => 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + myPeerId);
  const [myStatus, setMyStatus] = useState("Đang tập trung cao độ 🎯");
  const [myTimeStudied, setMyTimeStudied] = useState(0);

  // Hàm chuyển đổi đường dẫn avatar tương đối thành tuyệt đối để đồng bộ hóa WebSocket chính xác
  const getAbsoluteAvatarUrl = (avtPath: string | null | undefined) => {
    if (!avtPath) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${myPeerId}`;
    }
    // Nếu đã là đường dẫn tuyệt đối hoặc data URL
    if (avtPath.startsWith('http://') || avtPath.startsWith('https://') || avtPath.startsWith('data:')) {
      return avtPath;
    }
    // Nếu là đường dẫn tương đối (ví dụ /uploads/... hoặc /images/...)
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${avtPath}`;
    }
    return avtPath;
  };

  // Đồng bộ thông tin tài khoản thật từ NextAuth Session (nếu có)
  useEffect(() => {
    if (session?.user) {
      const name = session.user.name || 'Học viên';
      const rawAvatar = session.user.avatar || session.user.image;
      const avt = getAbsoluteAvatarUrl(rawAvatar);
      
      setMyName(name);
      setMyAvatar(avt);

      // Nếu socket đang mở, gửi gói tin cập nhật sự hiện diện với thông tin thật
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: "status_update",
          payload: {
            peerId: myPeerId,
            userName: name,
            avatar: avt,
            status: myStatus,
            timeStudied: myTimeStudied
          }
        }));
      }
    }
  }, [session, myPeerId, myStatus, myTimeStudied]);

  // ─── Trạng thái WebSocket & Server URL ──────────────────────────────
  const [serverUrl, setServerUrl] = useState('ws://localhost:3002');
  const [socketToken] = useState('learnhub_secret_token_2026');
  const [isConnected, setIsConnected] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [customServerInput, setCustomServerInput] = useState('');
  const socketRef = useRef<WebSocket | null>(null);

  // ─── Trạng thái Bạn học & Tin nhắn ──────────────────────────────────
  const [realUsers, setRealUsers] = useState<Companion[]>([]); // Danh sách người học thật online qua WebSocket
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', sender: 'Hệ thống LearnHub', avatar: '', text: 'Chào mừng bạn đến với phòng tự học chung thời gian thực. Hãy kết nối WebSocket ở máy chủ của bạn để bắt đầu học cùng người lạ thực sự!', timestamp: 'System', isMe: false }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmojiItem[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Tăng thời gian học của bản thân mỗi phút
  useEffect(() => {
    const timer = setInterval(() => {
      setMyTimeStudied((prev) => {
        const nextTime = prev + 1;
        // Gửi status_update broadcast lên WebSocket khi đổi thời gian học
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: "status_update",
            payload: { peerId: myPeerId, status: myStatus, timeStudied: nextTime }
          }));
        }
        return nextTime;
      });
    }, 60000);
    return () => clearInterval(timer);
  }, [myPeerId, myStatus]);

  // Cuộn xuống cuối chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Tải cấu hình serverUrl từ localStorage nếu có
  useEffect(() => {
    const savedUrl = localStorage.getItem('learnhub_ws_server_url');
    if (savedUrl) {
      setServerUrl(savedUrl);
      setCustomServerInput(savedUrl);
    } else {
      setCustomServerInput(serverUrl);
    }
  }, []);

  // ─── Thiết lập Kết nối WebSocket Real-time ───────────────────────────
  useEffect(() => {
    // Tự động kết nối đến serverUrl hiện tại kèm Token an toàn
    const fullWsUrl = `${serverUrl}?token=${socketToken}`;
    console.log(`[WebSocket] Thử kết nối đến: ${fullWsUrl}`);

    const socket = new WebSocket(fullWsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("[WebSocket] Kết nối thành công đến máy chủ 3002!");
      setIsConnected(true);

      // 1. Broadcast gói tin "join" thông báo sự hiện diện của mình cho phòng học
      socket.send(JSON.stringify({
        type: "join",
        payload: {
          peerId: myPeerId,
          userName: myName,
          avatar: myAvatar,
          status: myStatus,
          timeStudied: myTimeStudied
        }
      }));

      // Báo tin nhắn kết nối thành công lên khung chat
      setMessages((prev) => [
        ...prev,
        {
          id: 'ws_success_' + Date.now(),
          sender: 'Hệ thống LearnHub',
          avatar: '',
          text: `Đã kết nối thành công tới máy chủ học tập thực tế: ${serverUrl} 🟢`,
          timestamp: 'System',
          isMe: false
        }
      ]);
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log("[WebSocket] Nhận tin nhắn:", msg);

        if (!msg.type || !msg.payload) return;

        const { peerId, userName, avatar, status, timeStudied, text, emoji } = msg.payload;

        switch (msg.type) {
          case "join":
            // Nhận tin nhắn có học viên thật mới gia nhập phòng
            setRealUsers((prev) => {
              // Nếu chưa có trong danh sách thì thêm mới
              if (!prev.some((u) => u.id === peerId)) {
                return [...prev, { id: peerId, name: userName, avatar, status, timeStudied, lastActive: Date.now() }];
              }
              return prev;
            });

            // Gửi lại tin nhắn "presence" phản hồi lại thông tin của mình để học viên mới biết
            socket.send(JSON.stringify({
              type: "presence",
              payload: {
                peerId: myPeerId,
                userName: myName,
                avatar: myAvatar,
                status: myStatus,
                timeStudied: myTimeStudied
              }
            }));

            // Thông báo lên chat
            addSystemMessage(`${userName} vừa kết nối trực tuyến vào phòng học! 🟢`);
            break;

          case "presence":
            // Nhận tin chào hỏi từ các học viên thật đã có sẵn trong phòng
            setRealUsers((prev) => {
              if (!prev.some((u) => u.id === peerId)) {
                return [...prev, { id: peerId, name: userName, avatar, status, timeStudied, lastActive: Date.now() }];
              }
              return prev;
            });
            break;

          case "ping":
            // Nhận heartbeat ping từ client khác để giữ trạng thái online
            setRealUsers((prev) =>
              prev.map((u) =>
                u.id === peerId ? { ...u, lastActive: Date.now() } : u
              )
            );
            break;

          case "status_update":
            // Nhận cập nhật trạng thái học tập từ học viên khác
            setRealUsers((prev) =>
              prev.map((u) =>
                u.id === peerId ? { ...u, status, timeStudied } : u
              )
            );
            break;

          case "chat_message":
            // Nhận tin nhắn chat thực tế từ học viên khác
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            setMessages((prev) => [
              ...prev,
              {
                id: 'msg_' + Math.random().toString(),
                sender: userName,
                avatar,
                text,
                timestamp: timeStr,
                isMe: false
              }
            ]);
            break;

          case "emoji_spark":
            // Đồng bộ emoji sparks bay lơ lửng đồng thời trên màn hình
            localTriggerFloatingEmoji(emoji);
            break;

          case "leave":
            // Nhận thông báo một học viên rời phòng
            setRealUsers((prev) => prev.filter((u) => u.id !== peerId));
            addSystemMessage(`${userName || 'Học viên'} đã rời phòng học.`);
            break;

          default:
            break;
        }
      } catch (e) {
        console.error("Lỗi xử lý tin nhắn WebSocket:", e);
      }
    };

    socket.onclose = () => {
      console.log("[WebSocket] Đã ngắt kết nối khỏi server.");
      setIsConnected(false);
      setRealUsers([]); // Xóa danh sách người học thật
      setMessages((prev) => [
        ...prev,
        {
          id: 'ws_closed_' + Date.now(),
          sender: 'Hệ thống LearnHub',
          avatar: '',
          text: `Đã mất kết nối tới máy chủ WebSocket (${serverUrl}). Đang đợi kết nối lại hoặc hãy cấu hình địa chỉ IP máy chủ của bạn! 🔴`,
          timestamp: 'System',
          isMe: false
        }
      ]);
    };

    socket.onerror = (err) => {
      console.error("[WebSocket] Gặp lỗi:", err);
      setIsConnected(false);
    };

    // Heartbeat ping gửi định kỳ mỗi 10 giây để giữ kết nối không bị timeout
    const pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "ping",
          payload: { peerId: myPeerId }
        }));
      }
    }, 10000);

    // Dọn dẹp kết nối khi rời trang (unmount)
    return () => {
      clearInterval(pingInterval);
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "leave",
          payload: { peerId: myPeerId, userName: myName }
        }));
      }
      socket.close();
    };
  }, [serverUrl, myPeerId]);

  // Tự động kiểm tra timeout của người dùng thật (nếu quá 25s không ping thì kick khỏi online)
  useEffect(() => {
    const checkTimeout = setInterval(() => {
      const now = Date.now();
      setRealUsers((prev) => {
        const activeUsers = prev.filter((u) => {
          if (!u.lastActive) return true;
          const isTimeout = now - u.lastActive > 25000;
          if (isTimeout) {
            console.log(`Học viên ${u.name} hết hạn ping, tự động xóa offline.`);
          }
          return !isTimeout;
        });
        return activeUsers;
      });
    }, 5000);

    return () => clearInterval(checkTimeout);
  }, []);

  // Helper thêm tin nhắn hệ thống vào chat
  const addSystemMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: 'system_' + Math.random().toString(),
        sender: 'Hệ thống LearnHub',
        avatar: '',
        text,
        timestamp: 'System',
        isMe: false
      }
    ]);
  };

  // ─── Tương tác của Người Dùng ──────────────────────────────────────

  // Gửi chat
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // 1. Cập nhật giao diện của chính mình trước
    const newMsg: ChatMessage = {
      id: 'me_msg_' + Date.now(),
      sender: `${myName} (Bạn)`,
      avatar: myAvatar,
      text: chatInput.trim(),
      timestamp: timeStr,
      isMe: true
    };
    setMessages((prev) => [...prev, newMsg]);

    // 2. Broadcast tin nhắn qua WebSocket đến tất cả mọi người trong phòng học thật
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "chat_message",
        payload: {
          peerId: myPeerId,
          userName: myName,
          avatar: myAvatar,
          text: chatInput.trim()
        }
      }));
    }

    setChatInput('');
  };

  // Thay đổi trạng thái học tập của bản thân
  const handleStatusChange = (newStatus: string) => {
    setMyStatus(newStatus);

    // Broadcast trạng thái mới lên WebSocket
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "status_update",
        payload: {
          peerId: myPeerId,
          userName: myName,
          avatar: myAvatar,
          status: newStatus,
          timeStudied: myTimeStudied
        }
      }));
    }

    addSystemMessage(`Bạn đã đổi trạng thái thành: "${newStatus}"`);
  };

  // Click thả emoji (Local + Broadcast)
  const triggerEmojiSpark = (emoji: string) => {
    // 1. Thả emoji bay trên màn hình của mình
    localTriggerFloatingEmoji(emoji);

    // 2. Gửi tín hiệu WebSocket để thả emoji bay đồng thời trên màn hình của tất cả các bạn học khác!
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "emoji_spark",
        payload: { emoji }
      }));
    }
  };

  // Kích hoạt Emoji bay lên cục bộ trên màn hình
  const localTriggerFloatingEmoji = (emoji: string) => {
    const newItem: FloatingEmojiItem = {
      id: Math.random().toString(),
      emoji,
      x: Math.floor(Math.random() * 80) + 10, // Tọa độ X từ 10% - 90% chiều rộng khung hình
      size: Math.floor(Math.random() * 16) + 26, // Size 26px - 42px
    };

    setFloatingEmojis((prev) => [...prev, newItem]);

    // Unmount xoá hạt sau 1.8 giây để giải phóng bộ nhớ (đảm bảo 60 FPS)
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== newItem.id));
    }, 1800);
  };

  // Áp dụng Server URL tùy chọn khi bạn bè test ở nhà (link ngrok/localtunnel)
  const handleServerConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customServerInput.trim()) return;

    let targetUrl = customServerInput.trim();
    // Tự sửa format link từ http/https sang ws/wss nếu dán nhầm
    if (targetUrl.startsWith('https://')) {
      targetUrl = targetUrl.replace('https://', 'wss://');
    } else if (targetUrl.startsWith('http://')) {
      targetUrl = targetUrl.replace('http://', 'ws://');
    }

    if (!targetUrl.startsWith('ws://') && !targetUrl.startsWith('wss://')) {
      targetUrl = 'ws://' + targetUrl;
    }

    setServerUrl(targetUrl);
    localStorage.setItem('learnhub_ws_server_url', targetUrl);
    setShowConfig(false);
  };

  const displayCompanions = realUsers;

  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-transparent text-foreground font-sans relative transition-colors duration-300">

        {/* Glowing Aurora Background - Isolated to prevent parent auto-scrolling */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 dark:bg-primary/5 blur-[130px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-[130px]" />
        </div>

        {/* Sidebar */}
        <div className="h-full shrink-0 overflow-hidden">
          <Sidebar collapsed={false} />
        </div>

        {/* Real-time Floating Emojis Layer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
          <AnimatePresence>
            {floatingEmojis.map((item) => (
              <motion.div
                key={item.id}
                initial={{ y: '105vh', x: `${item.x}vw`, opacity: 1, scale: 0.8 }}
                animate={{
                  y: '-10vh',
                  x: [`${item.x}vw`, `${item.x + (Math.random() * 16 - 8)}vw`, `${item.x + (Math.random() * 16 - 8)}vw`],
                  opacity: 0,
                  scale: 1.2,
                  rotate: Math.random() * 80 - 40,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.8, ease: [0.1, 0.8, 0.3, 1] }}
                className="absolute select-none font-bold filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                style={{ fontSize: item.size }}
              >
                {item.emoji}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden px-6 py-6 md:px-8 flex flex-col justify-between relative z-10">

          {/* Top Header */}
          <div className="flex items-center justify-between w-full border-b border-border/40 pb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/workspace')}
                className="flex size-9 items-center justify-center rounded-xl border border-border bg-card hover:bg-accent/15 transition-all text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
              </button>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>Public Study Hub</span>
                  <span className={`size-2 rounded-full animate-pulse ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                </h1>
                <p className="text-xs text-muted-foreground">Kết nối bạn học thật sự qua mạng nội bộ hoặc internet từ xa</p>
              </div>
            </div>

            {/* Connection Status Badge & Server Settings trigger */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all bg-card hover:bg-accent/15 ${isConnected ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'border-destructive/30 text-destructive'
                  }`}
              >
                {isConnected ? (
                  <>
                    <Wifi className="size-3.5" />
                    <span className="hidden sm:inline">Server Trực tuyến 3002</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="size-3.5" />
                    <span className="hidden sm:inline">Mất kết nối Server</span>
                  </>
                )}
                <Settings className="size-3.5 ml-1 animate-spin" style={{ animationDuration: '6s' }} />
              </button>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-bold">
                <Users className="size-3.5" />
                <span>{realUsers.length + 1} Trực tuyến thật</span>
              </div>
            </div>
          </div>

          {/* Dynamic Configuration Server Popover */}
          <AnimatePresence>
            {showConfig && (
              <motion.form
                onSubmit={handleServerConfigSubmit}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full max-w-lg mx-auto rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-xl p-5 flex flex-col gap-4 shadow-2xl relative z-40 my-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    ⚙️
                    <span>Cấu hình máy chủ WebSocket Real-time (Cổng 3002)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowConfig(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Đóng
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Địa chỉ IP (ws://192.168.1.x:3002) hoặc link Ngrok..."
                    value={customServerInput}
                    onChange={(e) => setCustomServerInput(e.target.value)}
                    className="flex-1 bg-background/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50"
                  />
                  <Button type="submit" size="sm" className="text-xs bg-primary hover:bg-primary/95 text-white">
                    Kết nối
                  </Button>
                </div>

                <div className="text-[10px] text-muted-foreground space-y-1.5 leading-relaxed bg-muted/40 p-3 rounded-lg border border-border/50">
                  <p>💡 **Cách test cùng bạn bè ở nhà khác:**</p>
                  <p>1. Tại server của bạn, mở terminal gõ: <code className="text-primary font-mono select-all">npx localtunnel --port 3002</code></p>
                  <p>2. Copy link <code className="text-emerald-500">wss://...</code> được cấp gửi cho bạn của bạn ở nhà khác.</p>
                  <p>3. Bạn của bạn dán link đó vào ô cấu hình này là hai máy tự động nhận nhau qua internet tức thì!</p>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Core Grid Layout (Companions + Chat Panel) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full max-w-7xl mx-auto flex-1 min-h-0 py-4 overflow-hidden">

            {/* Left Column: Grid of Study Companions (Takes 7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-4 overflow-hidden">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Sparkles className="size-4 text-primary animate-pulse" />
                  Không gian ngồi học thời gian thực
                </h2>
                <span className="text-[10px] text-muted-foreground/60 italic">Trực tuyến LAN & Internet qua cổng 3002</span>
              </div>

              {/* Grid of real students connected via WebSocket */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">

                {/* You Card (Visualizing yourself inside the space) */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-2xl border border-primary/40 bg-primary/5 dark:bg-primary/10 glass-sheet flex gap-3.5 items-start relative overflow-hidden transition-all shadow-sm hover:scale-[1.01]"
                >
                  <div className="absolute top-2 right-2 flex size-2 rounded-full bg-primary shadow-[0_0_8px_rgba(108,92,231,0.5)] animate-pulse" />

                  <img
                    src={myAvatar}
                    alt={myName}
                    className="size-12 rounded-xl bg-muted border border-primary/20"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm text-primary truncate">{myName} (Bạn)</h3>
                      <span className="text-[9px] bg-primary/20 border border-primary/30 text-primary rounded px-1 flex items-center gap-0.5 font-bold shrink-0">
                        <Award className="size-2.5" />
                        {myTimeStudied}p
                      </span>
                    </div>

                    {/* Change personal status inline */}
                    <div className="mt-2 flex flex-col gap-1.5">
                      <span className="text-[10px] text-muted-foreground italic font-medium">Trạng thái của bạn:</span>
                      <select
                        value={myStatus}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className="bg-card border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary/40 focus:bg-accent/10"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt} className="bg-background text-foreground">{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </motion.div>

                {/* Display others companions (Real users) */}
                {displayCompanions.map((c) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.01 }}
                    className="p-4 rounded-2xl border flex gap-3.5 items-start relative group overflow-hidden transition-all border-emerald-500/30 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.04] shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                  >
                    {/* Glowing active indicator */}
                    <div className="absolute top-2 right-2 flex size-2 rounded-full animate-pulse bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />

                    <img
                      src={c.avatar}
                      alt={c.name}
                      className="size-12 rounded-xl bg-muted border border-border group-hover:scale-105 transition-transform"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm truncate text-emerald-600 dark:text-emerald-400 font-extrabold">
                          {c.name}
                        </h3>
                        <span className="text-[9px] rounded px-1 flex items-center gap-0.5 font-bold shrink-0 bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                          <Flame className="size-2.5 text-amber-500" />
                          {c.timeStudied}p
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[9px] uppercase px-1 rounded-sm font-bold tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                          Thực tế 🟢
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground mt-2 leading-snug line-clamp-2 italic">
                        "{c.status}"
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Emoji quick interactions bar */}
              <div className="rounded-2xl glass-sheet p-4 flex flex-col gap-3">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 select-none">
                  <Zap className="size-3.5 text-amber-500 animate-bounce" />
                  Bắn biểu cảm tương tác đồng thời trên tất cả màn hình (Emoji Sparks):
                </span>
                <div className="flex justify-between md:justify-start gap-4">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => triggerEmojiSpark(emoji)}
                      className="flex-1 md:flex-initial flex items-center justify-center size-12 text-2xl rounded-xl border border-border bg-card hover:bg-accent/20 hover:scale-110 active:scale-90 hover:border-primary/30 hover:shadow-[0_0_15px_rgba(108,92,231,0.15)] transition-all duration-200"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Column: Glassmorphic Study Chat Room (Takes 5 cols) */}
            <div className="lg:col-span-5 rounded-3xl glass-sheet p-5 flex flex-col justify-between h-[480px] lg:h-auto overflow-hidden">

              {/* Chat Header */}
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 select-none">
                  <MessageSquare className="size-4.5 text-primary" />
                  Hội thoại động lực học
                </h3>
                <span className="text-[10px] text-muted-foreground/60 italic">Chat real-time cổng 3002</span>
              </div>

              {/* Chat Messages container */}
              <div className="flex-1 overflow-y-auto my-4 space-y-3.5 pr-1 custom-scrollbar">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 items-start ${msg.isMe ? 'flex-row-reverse' : ''}`}
                  >
                    {msg.avatar ? (
                      <img src={msg.avatar} alt={msg.sender} className="size-8 rounded-lg border border-border bg-muted shrink-0" />
                    ) : (
                      <div className="size-8 rounded-lg border border-border bg-primary/10 flex items-center justify-center font-bold text-xs text-primary shrink-0 select-none">🔔</div>
                    )}

                    <div className={`flex flex-col max-w-[78%] ${msg.isMe ? 'items-end' : ''}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[10px] font-bold ${msg.isMe ? 'text-primary' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                          {msg.sender}
                        </span>
                        <span className="text-[8px] text-muted-foreground/50">{msg.timestamp}</span>
                      </div>
                      <div
                        className={`text-xs px-3 py-2 rounded-2xl leading-relaxed ${msg.isMe
                            ? 'bg-primary text-primary-foreground rounded-tr-none'
                            : 'bg-muted border border-border/50 text-foreground rounded-tl-none'
                          }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendChat} className="flex gap-2 border-t border-border/40 pt-3">
                <input
                  type="text"
                  placeholder={isConnected ? "Gửi lời chúc, chia sẻ mục tiêu học..." : "Hãy kết nối máy chủ để trò chuyện..."}
                  disabled={!isConnected}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-background/50 border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50 focus:bg-background/80 transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!isConnected}
                  className="flex size-9 items-center justify-center rounded-xl bg-primary hover:scale-105 active:scale-95 text-white transition-all shrink-0 disabled:opacity-50"
                >
                  <Send className="size-4" />
                </button>
              </form>

            </div>

          </div>

          {/* Simple Bottom Tip */}
          <div className="text-center text-[10px] text-muted-foreground/70 select-none pb-2 mt-4">
            Cam kết an toàn tuyệt đối: WebSocket Server cổng 3002 sử dụng access token query và giới hạn payload 4KB.
          </div>

        </main>
      </div>
    </TooltipProvider>
  );
}
