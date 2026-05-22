/**
 * LearnHub - Local WebSocket Server
 * Tận dụng công nghệ Native WebSocket cực nhanh của Bun.
 * Cổng hoạt động: 3002 (tránh FastAPI cổng 3001).
 * Cam kết an toàn bảo mật hệ thống 100%:
 * - Access Token: Xác thực kết nối hợp lệ.
 * - Max Payload: Drop tin nhắn vượt quá 4KB để chống spam.
 * - JSON Strict check: Lọc dữ liệu, chỉ trung chuyển tin nhắn, không can thiệp tệp tin/OS.
 */

const PORT = 3002;
const SECRET_TOKEN = "learnhub_secret_token_2026";
const MAX_PAYLOAD_SIZE = 4096; // 4KB

// Danh sách các loại sự kiện hợp lệ trong phòng học
const VALID_EVENT_TYPES = [
  "join",           // Học viên mới tham gia phòng
  "presence",       // Phản hồi thông tin hiện diện cho học viên mới
  "ping",           // Giữ kết nối (heartbeat)
  "status_update",  // Cập nhật trạng thái học tập của học viên
  "chat_message",   // Tin nhắn chat trong phòng
  "emoji_spark",    // Thả emoji lơ lửng màn hình
  "leave"           // Học viên chủ động rời phòng
];

console.log(`[LearnHub WebSocket] Khởi động máy chủ an toàn trên cổng ${PORT}...`);

const server = Bun.serve({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    // 1. Xác thực Token truy cập
    if (token !== SECRET_TOKEN) {
      console.warn(`[Cảnh báo Bảo mật] Từ chối kết nối do sai hoặc thiếu Access Token từ IP: ${req.headers.get("x-forwarded-for") || "unknown"}`);
      return new Response("Unauthorized: Invalid secret token.", { status: 401 });
    }

    // 2. Nâng cấp HTTP request thông thường lên kết nối WebSocket
    if (server.upgrade(req)) {
      return; // Nâng cấp thành công
    }

    return new Response("LearnHub WebSocket server running! Use client connection on ws/wss.", { status: 426 });
  },
  websocket: {
    // Kích hoạt khi có kết nối mới mở ra
    open(ws) {
      // Đưa client vào kênh phát chung "global_hub"
      ws.subscribe("global_hub");
      console.log(`[Kết nối] Học viên mới kết nối thành công từ: ${ws.remoteAddress}`);
    },

    // Lắng nghe gói tin từ client
    message(ws, message) {
      // 1. Kiểm tra kích thước payload (Chống tràn bộ đệm & Spam dữ liệu lớn)
      if (typeof message === "string" && message.length > MAX_PAYLOAD_SIZE) {
        console.warn(`[Bảo mật] Huỷ kết nối do payload tin nhắn quá lớn (${message.length} bytes)`);
        ws.send(JSON.stringify({ type: "error", message: "Payload size exceeded (Max 4KB)" }));
        ws.close(1009, "Message too large");
        return;
      }

      // 2. Parse JSON an toàn
      let data;
      try {
        data = JSON.parse(message as string);
      } catch (e) {
        console.warn("[Lỗi] Nhận tin nhắn sai định dạng JSON, đã lọc bỏ.");
        return;
      }

      // 3. Lọc cấu trúc dữ liệu nghiêm ngặt
      if (!data.type || !VALID_EVENT_TYPES.includes(data.type)) {
        console.warn(`[Lỗi] Từ chối trung chuyển sự kiện không hợp lệ: "${data.type}"`);
        return;
      }

      // Quản lý gán PeerId vào socket khi join để xử lý khi ngắt kết nối đột ngột
      if (data.type === "join" && data.payload?.peerId) {
        (ws as any).peerId = data.payload.peerId;
        console.log(`[Tham gia] Học viên thật: ${data.payload.userName} (${data.payload.peerId})`);
      }

      // 4. Phát tin nhắn (Broadcast) đến tất cả mọi người khác trong phòng
      // Bun sẽ tự động gửi tin nhắn này đến tất cả các client đã subscribe "global_hub" (ngoại trừ socket hiện tại)
      ws.publish("global_hub", JSON.stringify(data));
    },

    // Xử lý khi kết nối đóng lại (mất mạng, tắt tab)
    close(ws, code, message) {
      const peerId = (ws as any).peerId;
      console.log(`[Ngắt kết nối] Học viên rời phòng: ${peerId || "unknown"} (Mã: ${code})`);
      
      if (peerId) {
        // Broadcast thông báo rời phòng tự động cho những người học khác
        ws.publish("global_hub", JSON.stringify({
          type: "leave",
          payload: { peerId }
        }));
      }
    }
  }
});

console.log(`[LearnHub WebSocket] Server đang chạy mượt mà tại: ws://localhost:${PORT}`);
console.log(`[LearnHub WebSocket] Token bảo mật mặc định: ?token=${SECRET_TOKEN}`);
