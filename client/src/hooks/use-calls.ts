/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { useSocket } from "@/hooks/use-socket";
import { useAuth } from "@/hooks/use-auth";
import { API } from "@/lib/axios-client";
import { toast } from "sonner";

export type CallType = "audio" | "video";

interface IncomingCall {
  chatId: string;
  fromUserId: string;
  fromUserName?: string;
  fromUserAvatar?: string | null;
  type: CallType;
  timestamp: number;
}

interface CallState {
  // media
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  // signaling
  inCall: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  incomingCall: IncomingCall | null;
  callType: CallType | null;
  currentVideoDeviceId: string | null;
  currentPeerUserId: string | null; // the other peer in 1:1
  currentChatId: string | null;
  pendingOffer: any | null;
  pendingCandidates: any[];

  // methods
  initListeners: () => void;
  startCall: (chatId: string, toUserId: string, type: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: (notifyRemote?: boolean) => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  switchCamera: () => Promise<void>;
}

let pc: RTCPeerConnection | null = null;

let ringtoneAudio: HTMLAudioElement | null = null;

const getRingtone = () => {
  if (!ringtoneAudio) {
    const baseUrl = import.meta.env.VITE_API_URL || "";
    const encodedName = encodeURIComponent("bvg ringing tone.mp3");
    ringtoneAudio = new Audio(`${baseUrl}/sound/${encodedName}`);
    ringtoneAudio.loop = true;
  }
  return ringtoneAudio;
};

const playRingtone = () => {
  try {
    const audio = getRingtone();
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  } catch (e) {
    console.error("Failed to play ringtone", e);
  }
};

const stopRingtone = () => {
  if (ringtoneAudio) {
    ringtoneAudio.pause();
    ringtoneAudio.currentTime = 0;
  }
};

let cachedIce: RTCConfiguration | null = null;
let cachedAt: number | null = null;
const ICE_CACHE_MS = 50 * 60 * 1000; // 50 minutes

const getIceConfig = async (): Promise<RTCConfiguration> => {
  if (cachedIce && cachedAt && Date.now() - cachedAt < ICE_CACHE_MS) {
    return cachedIce;
  }
  try {
    const { data } = await API.get("/ice/twilio");
    const servers = (data?.iceServers || []).map((s: any) => ({
      urls: s.urls || s.url,
      username: s.username,
      credential: s.credential,
    })).filter((s: any) => !!s.urls);
    cachedIce = { iceServers: servers } as RTCConfiguration;
    cachedAt = Date.now();
    if (servers.length === 0) throw new Error("No ICE servers");
    return cachedIce;
  } catch {
    // Fallback to STUN only
    const fallback = { iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }] } as RTCConfiguration;
    cachedIce = fallback;
    cachedAt = Date.now();
    return fallback;
  }
};

export const useCalls = create<CallState>()((set, get) => ({
  localStream: null,
  remoteStream: null,
  inCall: false,
  isMuted: false,
  isCameraOff: false,
  incomingCall: null,
  callType: null,
  currentVideoDeviceId: null,
  currentPeerUserId: null,
  currentChatId: null,
  pendingOffer: null,
  pendingCandidates: [],

  initListeners: () => {
    const { socket } = useSocket.getState();
    if (!socket) return;

    // Avoid duplicate listeners
    socket.off("call:incoming");
    socket.off("call:offer");
    socket.off("call:answer");
    socket.off("call:candidate");
    socket.off("call:accept");
    socket.off("call:reject");
    socket.off("call:end");

    socket.on("call:incoming", (payload: IncomingCall) => {
      // if already in a call, auto-reject
      if (get().inCall) {
        socket.emit("call:reject", {
          chatId: payload.chatId,
          toUserId: payload.fromUserId,
          reason: "busy",
        });
        return;
      }
      set({ incomingCall: payload, callType: payload.type, currentPeerUserId: payload.fromUserId, currentChatId: payload.chatId });
      playRingtone();
    });

    socket.on("call:offer", async (payload: { chatId: string; fromUserId: string; sdp: any }) => {
      try {
        if (!pc) {
          set({ pendingOffer: payload.sdp });
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        const { socket } = useSocket.getState();
        socket?.emit("call:answer", { chatId: payload.chatId, toUserId: payload.fromUserId, sdp: answer });
      } catch (e) {
        console.error("Error handling offer:", e);
      }
    });

    socket.on("call:answer", async (payload: { chatId: string; fromUserId: string; sdp: any }) => {
      try {
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      } catch (e) {
        console.error("Error handling answer:", e);
      }
    });

    socket.on("call:candidate", async (payload: { chatId: string; fromUserId: string; candidate: any }) => {
      try {
        if (!pc) {
          set((s) => ({ pendingCandidates: [...s.pendingCandidates, payload.candidate] }));
          return;
        }
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch (e) {
        console.error("Error adding ICE candidate:", e);
      }
    });

    socket.on("call:accept", () => {
      stopRingtone();
      toast.success("Call accepted");
    });

    socket.on("call:reject", () => {
      stopRingtone();
      toast.error("Call rejected");
      get().endCall(false);
    });

    socket.on("call:end", () => {
      stopRingtone();
      toast("Call ended");
      get().endCall(false);
    });
  },

  startCall: async (chatId, toUserId, type) => {
    const { socket } = useSocket.getState();
    const { user } = useAuth.getState();
    if (!socket || !user?.id) return;

    try {
      // get local media
      const local = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
      const videoTrack = local.getVideoTracks()[0];
      const settings = videoTrack?.getSettings();
      const videoDeviceId = settings && typeof settings.deviceId === "string" ? settings.deviceId : null;
      set({ localStream: local, remoteStream: null, inCall: true, callType: type, currentVideoDeviceId: videoDeviceId, isMuted: false, isCameraOff: type !== "video" ? true : false, currentPeerUserId: toUserId, currentChatId: chatId });

      // pc
      const ice = await getIceConfig();
      pc = new RTCPeerConnection(ice);
      local.getTracks().forEach((t) => pc!.addTrack(t, local));

      pc.ontrack = (ev) => {
        const [remote] = ev.streams;
        if (remote) {
          set({ remoteStream: remote });
        }
      };

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          socket.emit("call:candidate", { chatId, toUserId, candidate: ev.candidate });
        }
      };

      // ring and send offer
      socket.emit("call:invite", { chatId, toUserId, type });
      playRingtone();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("call:offer", { chatId, toUserId, sdp: offer });
    } catch (e: any) {
      console.error(e);
      get().endCall();
    }
  },

  acceptCall: async () => {
    const call = get().incomingCall;
    const { socket } = useSocket.getState();
    if (!call || !socket) return;
    try {
      stopRingtone();
      const local = await navigator.mediaDevices.getUserMedia({ audio: true, video: call.type === "video" });
      const videoTrack = local.getVideoTracks()[0];
      const settings = videoTrack?.getSettings();
      const videoDeviceId = settings && typeof settings.deviceId === "string" ? settings.deviceId : null;
      set({ localStream: local, remoteStream: null, inCall: true, callType: call.type, currentVideoDeviceId: videoDeviceId, isMuted: false, isCameraOff: call.type !== "video" ? true : false });

      const ice = await getIceConfig();
      pc = new RTCPeerConnection(ice);
      local.getTracks().forEach((t) => pc!.addTrack(t, local));

      pc.ontrack = (ev) => {
        const [remote] = ev.streams;
        if (remote) set({ remoteStream: remote });
      };

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          socket.emit("call:candidate", { chatId: call.chatId, toUserId: call.fromUserId, candidate: ev.candidate });
        }
      };

      socket.emit("call:accept", { chatId: call.chatId, toUserId: call.fromUserId });
      // If offer arrived before accept, apply now and answer
      const pendingOffer = get().pendingOffer;
      if (pendingOffer) {
        await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("call:answer", { chatId: call.chatId, toUserId: call.fromUserId, sdp: answer });
        set({ pendingOffer: null });
      }
      const queued = get().pendingCandidates;
      if (queued.length) {
        for (const c of queued) {
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
        }
        set({ pendingCandidates: [] });
      }

      set({ incomingCall: null, currentPeerUserId: call.fromUserId, currentChatId: call.chatId });
    } catch (e) {
      console.error(e);
      get().rejectCall();
    }
  },

  rejectCall: () => {
    const { socket } = useSocket.getState();
    const call = get().incomingCall;
    stopRingtone();
    if (call) {
      socket?.emit("call:reject", { chatId: call.chatId, toUserId: call.fromUserId });
    }
    set({ incomingCall: null });
  },

  endCall: (notifyRemote = true) => {
    stopRingtone();
    const { socket } = useSocket.getState();
    const toUserId = get().currentPeerUserId;
    const chatId = get().currentChatId;

    if (pc) {
      try { pc.getSenders().forEach((s) => s.track && s.track.stop()); } catch {}
      try { pc.getTransceivers().forEach((t) => t.stop && t.stop()); } catch {}
      pc.ontrack = null;
      pc.onicecandidate = null;
      try { pc.close(); } catch {}
      pc = null;
    }

    const local = get().localStream;
    local?.getTracks().forEach((t) => t.stop());

    set({ localStream: null, remoteStream: null, inCall: false, callType: null, currentVideoDeviceId: null, isMuted: false, isCameraOff: false, currentPeerUserId: null, currentChatId: null, pendingOffer: null, pendingCandidates: [] });

    if (socket && toUserId && chatId && notifyRemote) {
      socket.emit("call:end", { chatId, toUserId, reason: "ended" });
    }
  },

  toggleMute: () => {
    const local = get().localStream;
    if (!local) return;
    const next = !get().isMuted;
    local.getAudioTracks().forEach((t) => (t.enabled = !next));
    set({ isMuted: next });
  },

  toggleCamera: () => {
    const local = get().localStream;
    if (!local) return;
    const next = !get().isCameraOff;
    local.getVideoTracks().forEach((t) => (t.enabled = !next));
    set({ isCameraOff: next });
  },

  switchCamera: async () => {
    const state = get();
    if (!state.inCall || state.callType !== "video" || !pc) {
      toast.error("No active video call to switch camera");
      return;
    }

    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        toast.error("Camera switching is not supported in this browser");
        return;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");

      if (videoDevices.length <= 1) {
        toast.error("No other camera available");
        return;
      }

      const currentId = state.currentVideoDeviceId;
      const currentIndex = currentId
        ? videoDevices.findIndex((d) => d.deviceId === currentId)
        : -1;
      const nextIndex =
        currentIndex >= 0 && currentIndex < videoDevices.length - 1
          ? currentIndex + 1
          : 0;
      const nextDevice = videoDevices[nextIndex];

      const tempStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: nextDevice.deviceId } },
        audio: false,
      });

      const newVideoTrack = tempStream.getVideoTracks()[0];
      if (!newVideoTrack) {
        toast.error("Unable to access the selected camera");
        return;
      }

      const sender = pc
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");

      if (!sender) {
        toast.error("No video sender found for this call");
        return;
      }

      newVideoTrack.enabled = !state.isCameraOff;
      await sender.replaceTrack(newVideoTrack);

      const oldLocal = state.localStream;
      const audioTracks = oldLocal?.getAudioTracks() ?? [];
      const combined = new MediaStream([...audioTracks, newVideoTrack]);

      set({
        localStream: combined,
        currentVideoDeviceId: nextDevice.deviceId,
      });

      oldLocal?.getVideoTracks().forEach((t) => t.stop());
    } catch (e) {
      console.error("Failed to switch camera", e);
      toast.error("Failed to switch camera");
    }
  },
}));
