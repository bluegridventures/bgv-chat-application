import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { HTTPSTATUS } from "../config/http.config";
import { Env } from "../config/env.config";
import { AccessToken } from "livekit-server-sdk";

export const getRtcTokenController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id as string | undefined;

    if (!userId) {
      return res.status(HTTPSTATUS.UNAUTHORIZED).json({
        message: "Unauthorized",
      });
    }

    const { roomName, metadata } = req.body as {
      roomName?: string;
      metadata?: Record<string, any>;
    };

    if (!roomName || typeof roomName !== "string") {
      return res.status(HTTPSTATUS.BAD_REQUEST).json({
        message: "roomName is required",
      });
    }

    const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } = Env;
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
        message: "LiveKit is not configured on the server",
      });
    }

    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: userId,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();

    return res.status(HTTPSTATUS.OK).json({
      token: jwt,
      url: LIVEKIT_URL,
    });
  }
);
