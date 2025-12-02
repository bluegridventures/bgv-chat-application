import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import {
  deleteMessageSchema,
  editMessageSchema,
  reactMessageSchema,
  sendMessageSchema,
} from "../validators/message.validator";
import { HTTPSTATUS } from "../config/http.config";
import {
  deleteMessageService,
  editMessageService,
  reactToMessageService,
  sendMessageService,
} from "../services/message.service";

export const sendMessageController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const body = sendMessageSchema.parse(req.body);

    const result = await sendMessageService(userId, body);

    return res.status(HTTPSTATUS.OK).json({
      message: "Message sent successfully",
      ...result,
    });
  }
);

export const reactMessageController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const body = reactMessageSchema.parse(req.body);

    const result = await reactToMessageService(userId, body);

    return res.status(HTTPSTATUS.OK).json({
      message: "Reaction updated",
      ...result,
    });
  }
);

export const editMessageController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const body = editMessageSchema.parse(req.body);

    const result = await editMessageService(userId, body);

    return res.status(HTTPSTATUS.OK).json({
      message: "Message updated successfully",
      ...result,
    });
  }
);

export const deleteMessageController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const body = deleteMessageSchema.parse(req.body);

    const result = await deleteMessageService(userId, body);

    return res.status(HTTPSTATUS.OK).json({
      message: "Message deleted successfully",
      ...result,
    });
  }
);
