import { io, Socket } from "socket.io-client";
import { create } from "zustand";

const BASE_URL = import.meta.env.VITE_API_URL || "/";

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
    }

    // Reuse existing socket only if dev token matches (or not in dev)
    const existingToken = (socket as any)?.auth?.token as string | undefined;
    const canReuse = !!socket && socket.connected && (
      import.meta.env.MODE !== "development" || existingToken === nextToken || (!existingToken && !nextToken)
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
