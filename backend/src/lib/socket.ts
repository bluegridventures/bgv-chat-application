import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { Server, type Socket } from "socket.io";
import { Env } from "../config/env.config";
import { prisma } from "../config/prisma.config";
import { validateChatParticipant } from "../services/chat.service";

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

let io: Server | null = null;

const onlineUsers = new Map<string, string>();

export const initializeSocket = (httpServer: HTTPServer) => {
  io = new Server(httpServer, {
    path: "/api/socket.io",
    cors: {
      origin: Env.FRONTEND_ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie || "";
      let token: string | undefined;

      const authToken = (socket.handshake as any)?.auth?.token as string | undefined;
      if (authToken && typeof authToken === "string" && authToken.length > 0) {
        token = authToken;
      }

      if (!token) {
        const cookiePairs = rawCookie.split(";").map((c) => c.trim());
        for (const pair of cookiePairs) {
          const idx = pair.indexOf("=");
          if (idx === -1) continue;
          const key = pair.slice(0, idx);
          const val = pair.slice(idx + 1);
          if (key === "accessToken") {
            token = val;
            break;
          }
        }
      }

      if (!token) return next(new Error("Unauthorized"));

      const decodedToken = jwt.verify(token, Env.JWT_SECRET) as {
        userId: string;
      };
      if (!decodedToken) return next(new Error("Unauthorized"));

      socket.userId = decodedToken.userId;
      next();
    } catch (error) {
      next(new Error("Internal server error"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    const newSocketId = socket.id;
    if (!socket.userId) {
      socket.disconnect(true);
      return;
    }

    //register socket for the user
    onlineUsers.set(userId, newSocketId);

    //BroadCast online users to all socket
    io?.emit("online:users", Array.from(onlineUsers.keys()));

    //create personnal room for user
    socket.join(`user:${userId}`);

    socket.on(
      "chat:join",
      async (chatId: string, callback?: (err?: string) => void) => {
        try {
          await validateChatParticipant(chatId, userId);
          socket.join(`chat:${chatId}`);
          console.log(`User ${userId} join room chat:${chatId}`);

          callback?.();
        } catch (error) {
          callback?.("Error joining chat");
        }
      }
    );

    socket.on("chat:leave", (chatId: string) => {
      if (chatId) {
        socket.leave(`chat:${chatId}`);
        console.log(`User ${userId} left room chat:${chatId}`);
      }
    });

    // Typing indicator events
    socket.on("typing:start", async (chatId: string) => {
      try {
        await validateChatParticipant(chatId, userId);
        socket.to(`chat:${chatId}`).emit("typing:start", {
          userId,
          chatId,
        });
      } catch (error) {
        console.error("Error in typing:start:", error);
      }
    });

    socket.on("typing:stop", async (chatId: string) => {
      try {
        await validateChatParticipant(chatId, userId);
        socket.to(`chat:${chatId}`).emit("typing:stop", {
          userId,
          chatId,
        });
      } catch (error) {
        console.error("Error in typing:stop:", error);
      }
    });

    socket.on(
      "call:invite",
      async (payload: { chatId: string; toUserId: string; type: "audio" | "video" }) => {
        try {
          if (!payload?.chatId || !payload?.toUserId) return;
          await validateChatParticipant(payload.chatId, userId);
          await validateChatParticipant(payload.chatId, payload.toUserId);

          let fromUserName: string | undefined;
          let fromUserAvatar: string | null | undefined;

          try {
            const caller = await prisma.user.findUnique({
              where: { id: userId },
              select: { name: true, avatar: true },
            });
            fromUserName = caller?.name;
            fromUserAvatar = caller?.avatar ?? null;
          } catch (err) {
            console.error("Error fetching caller info for call:invite:", err);
          }

          io?.to(`user:${payload.toUserId}`).emit("call:incoming", {
            chatId: payload.chatId,
            fromUserId: userId,
            fromUserName,
            fromUserAvatar,
            type: payload.type,
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error("Error in call:invite:", error);
        }
      }
    );

    socket.on(
      "call:offer",
      async (payload: { chatId: string; toUserId: string; sdp: any }) => {
        try {
          if (!payload?.chatId || !payload?.toUserId || !payload?.sdp) return;
          await validateChatParticipant(payload.chatId, userId);
          await validateChatParticipant(payload.chatId, payload.toUserId);
          io?.to(`user:${payload.toUserId}`).emit("call:offer", {
            chatId: payload.chatId,
            fromUserId: userId,
            sdp: payload.sdp,
          });
        } catch (error) {
          console.error("Error in call:offer:", error);
        }
      }
    );

    socket.on(
      "call:answer",
      async (payload: { chatId: string; toUserId: string; sdp: any }) => {
        try {
          if (!payload?.chatId || !payload?.toUserId || !payload?.sdp) return;
          await validateChatParticipant(payload.chatId, userId);
          await validateChatParticipant(payload.chatId, payload.toUserId);
          io?.to(`user:${payload.toUserId}`).emit("call:answer", {
            chatId: payload.chatId,
            fromUserId: userId,
            sdp: payload.sdp,
          });
        } catch (error) {
          console.error("Error in call:answer:", error);
        }
      }
    );

    socket.on(
      "call:candidate",
      async (payload: { chatId: string; toUserId: string; candidate: any }) => {
        try {
          if (!payload?.chatId || !payload?.toUserId || !payload?.candidate) return;
          await validateChatParticipant(payload.chatId, userId);
          await validateChatParticipant(payload.chatId, payload.toUserId);
          io?.to(`user:${payload.toUserId}`).emit("call:candidate", {
            chatId: payload.chatId,
            fromUserId: userId,
            candidate: payload.candidate,
          });
        } catch (error) {
          console.error("Error in call:candidate:", error);
        }
      }
    );

    socket.on(
      "call:accept",
      async (payload: { chatId: string; toUserId: string }) => {
        try {
          if (!payload?.chatId || !payload?.toUserId) return;
          await validateChatParticipant(payload.chatId, userId);
          await validateChatParticipant(payload.chatId, payload.toUserId);
          io?.to(`user:${payload.toUserId}`).emit("call:accept", {
            chatId: payload.chatId,
            fromUserId: userId,
          });
        } catch (error) {
          console.error("Error in call:accept:", error);
        }
      }
    );

    socket.on(
      "call:reject",
      async (payload: { chatId: string; toUserId: string; reason?: string }) => {
        try {
          if (!payload?.chatId || !payload?.toUserId) return;
          await validateChatParticipant(payload.chatId, userId);
          await validateChatParticipant(payload.chatId, payload.toUserId);
          io?.to(`user:${payload.toUserId}`).emit("call:reject", {
            chatId: payload.chatId,
            fromUserId: userId,
            reason: payload.reason,
          });
        } catch (error) {
          console.error("Error in call:reject:", error);
        }
      }
    );

    socket.on(
      "call:end",
      async (payload: { chatId: string; toUserId: string; reason?: string }) => {
        try {
          if (!payload?.chatId || !payload?.toUserId) return;
          await validateChatParticipant(payload.chatId, userId);
          await validateChatParticipant(payload.chatId, payload.toUserId);
          io?.to(`user:${payload.toUserId}`).emit("call:end", {
            chatId: payload.chatId,
            fromUserId: userId,
            reason: payload.reason,
          });
        } catch (error) {
          console.error("Error in call:end:", error);
        }
      }
    );

    // Group call announce events
    socket.on(
      "group:call:started",
      async (payload: { chatId: string; type: "audio" | "video" }) => {
        try {
          if (!payload?.chatId) return;
          await validateChatParticipant(payload.chatId, userId);
          socket.to(`chat:${payload.chatId}`).emit("group:call:started", {
            chatId: payload.chatId,
            type: payload.type,
            startedBy: userId,
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error("Error in group:call:started:", error);
        }
      }
    );

    socket.on(
      "group:call:ended",
      async (payload: { chatId: string }) => {
        try {
          if (!payload?.chatId) return;
          await validateChatParticipant(payload.chatId, userId);
          socket.to(`chat:${payload.chatId}`).emit("group:call:ended", {
            chatId: payload.chatId,
            endedBy: userId,
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error("Error in group:call:ended:", error);
        }
      }
    );

    socket.on("disconnect", () => {
      if (onlineUsers.get(userId) === newSocketId) {
        if (userId) onlineUsers.delete(userId);

        io?.emit("online:users", Array.from(onlineUsers.keys()));

        console.log("socket disconnected", {
          userId,
          newSocketId,
        });
      }
    });
  });
};

function getIO() {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

export const emitNewChatToParticpants = (
  participantIds: string[] = [],
  chat: any
) => {
  const io = getIO();
  for (const participantId of participantIds) {
    io.to(`user:${participantId}`).emit("chat:new", chat);
  }
};

export const emitMessageUpdatedToChatRoom = (
  chatId: string,
  message: any
) => {
  const io = getIO();
  io.to(`chat:${chatId}`).emit("message:updated", message);
};

export const emitMessageDeletedToChatRoom = (
  chatId: string,
  messageId: string
) => {
  const io = getIO();
  io.to(`chat:${chatId}`).emit("message:deleted", { chatId, messageId });
};

export const emitNewMessageToChatRoom = (
  senderId: string, //userId that sent the message
  chatId: string,
  message: any
) => {
  const io = getIO();
  const senderSocketId = onlineUsers.get(senderId?.toString());

  console.log(senderId, "senderId");
  console.log(senderSocketId, "sender socketid exist");
  console.log("All online users:", Object.fromEntries(onlineUsers));

  if (senderSocketId) {
    io.to(`chat:${chatId}`).except(senderSocketId).emit("message:new", message);
  } else {
    io.to(`chat:${chatId}`).emit("message:new", message);
  }
};

export const emitLastMessageToParticipants = (
  participantIds: string[],
  chatId: string,
  lastMessage: any
) => {
  const io = getIO();
  const payload = { chatId, lastMessage };

  for (const participantId of participantIds) {
    io.to(`user:${participantId}`).emit("chat:update", payload);
  }
};
