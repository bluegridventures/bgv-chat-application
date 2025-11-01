import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { HTTPSTATUS } from "../config/http.config";
import { chatIdSchema, createChatSchema } from "../validators/chat.validator";
import {
  createChatService,
  getSingleChatService,
  getUserChatsService,
  deleteChatService,
} from "../services/chat.service";

export const createChatController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const body = createChatSchema.parse(req.body);

    const chat = await createChatService(userId, body);

    return res.status(HTTPSTATUS.OK).json({
      message: "Chat created or retrieved successfully",
      chat,
    });
  }
);

export const getUserChatsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const chats = await getUserChatsService(userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "User chats retrieved successfully",
      chats,
    });
  }
);

export const getSingleChatController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id } = chatIdSchema.parse(req.params);

    const { chat, messages } = await getSingleChatService(id, userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "User chats retrieved successfully",
      chat,
      messages,
    });
  }
);

export const deleteChatController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id } = chatIdSchema.parse(req.params);

    if (!userId) {
      return res.status(HTTPSTATUS.UNAUTHORIZED).json({
        message: "Unauthorized",
      });
    }

    const result = await deleteChatService(id, userId);

    return res.status(HTTPSTATUS.OK).json(result);
  }
);
