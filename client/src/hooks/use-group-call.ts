/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { API } from "@/lib/axios-client";
import { useSocket } from "@/hooks/use-socket";

export type GroupCallType = "audio" | "video";

interface GroupCallState {
  open: boolean;
  isConnecting: boolean;
  error: string | null;
  roomName: string | null; // chatId
  token: string | null;
  serverUrl: string | null;
  type: GroupCallType | null;

  startGroupCall: (chatId: string, type: GroupCallType) => Promise<void>;
  endGroupCall: () => void;
}

export const useGroupCall = create<GroupCallState>()((set) => ({
  open: false,
  isConnecting: false,
  error: null,
  roomName: null,
  token: null,
  serverUrl: null,
  type: null,

  startGroupCall: async (chatId: string, type: GroupCallType) => {
    set({ isConnecting: true, error: null });
    try {
      const { data } = await API.post("/rtc/token", { roomName: chatId });
      const { socket } = useSocket.getState();
      set({
        open: true,
        isConnecting: false,
        roomName: chatId,
        token: data?.token || null,
        serverUrl: data?.url || null,
        type,
      });
      socket?.emit("group:call:started", { chatId, type });
    } catch (e: any) {
      set({ isConnecting: false, error: e?.response?.data?.message || e?.message || "Failed to start call" });
    }
  },

  endGroupCall: () => {
    const { socket } = useSocket.getState();
    const roomName = (useGroupCall.getState().roomName);
    if (roomName) socket?.emit("group:call:ended", { chatId: roomName });
    set({ open: false, token: null, serverUrl: null, roomName: null, type: null, error: null });
  },
}));
