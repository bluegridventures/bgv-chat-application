import { io, Socket } from "socket.io-client";
import { create } from "zustand";

const useProxy = (import.meta.env as any).VITE_USE_PROXY === "1";
const isProd = import.meta.env.MODE === "production";
// In production, bypass Vercel rewrites and connect directly to backend
const BASE_URL = isProd
  ? (import.meta.env.VITE_API_URL || "")
  : (useProxy ? "" : (import.meta.env.VITE_API_URL || ""));

interface SocketState {
  socket: Socket | null;
  onlineUsers: string[];
  connectSocket: () => void;
  disconnectSocket: () => void;
}

export const useSocket = create<SocketState>()((set, get) => ({
  socket: null,
  onlineUsers: [],

  connectSocket: () => {
    const { socket } = get();
    console.log(socket, "socket");

    let nextToken: string | null = null;
    if (import.meta.env.MODE === "development") {
      try { nextToken = sessionStorage.getItem("DEV_ACCESS_TOKEN"); } catch {}
    } else {
      try { nextToken = localStorage.getItem("ACCESS_TOKEN"); } catch {}
    }

    // Reuse existing socket only if dev token matches (or not in dev)
    const existingToken = (socket as any)?.auth?.token as string | undefined;
    const canReuse = !!socket && socket.connected && (
      existingToken === nextToken || (!existingToken && !nextToken)
    );
    if (canReuse) return;

    // If a socket exists, disconnect before creating a new one
    if (socket) {
      try { socket.disconnect(); } catch {}
    }

    const auth = nextToken ? { token: nextToken } : undefined;
    const newSocket = io(BASE_URL, {
      withCredentials: true,
      autoConnect: true,
      path: "/api/socket.io",
      transports: ["websocket"],
      auth,
    });

    set({ socket: newSocket });

    newSocket.on("connect", () => {
      console.log("Socket connected", newSocket.id);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connect_error:", err?.message, err);
    });

    newSocket.on("error", (err) => {
      console.error("Socket error:", err);
    });

    newSocket.on("online:users", (userIds) => {
      console.log("Online users", userIds);
      set({ onlineUsers: userIds });
    });
  },
  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },
}));
