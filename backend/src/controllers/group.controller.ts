import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { HTTPSTATUS } from "../config/http.config";
import {
  createGroupService,
  updateGroupService,
  addGroupMemberService,
  removeGroupMemberService,
  leaveGroupService,
} from "../services/group.service";

export const createGroupController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(HTTPSTATUS.UNAUTHORIZED).json({
        message: "Unauthorized",
      });
    }

    const { groupName, groupDescription, groupAvatar, participantIds } = req.body;

    const group = await createGroupService({
      groupName,
      groupDescription,
      groupAvatar,
      participantIds,
      createdBy: userId,
    });

    return res.status(HTTPSTATUS.CREATED).json({
      message: "Group created successfully",
      chat: group,
    });
  }
);

export const updateGroupController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { chatId } = req.params;

    if (!userId) {
      return res.status(HTTPSTATUS.UNAUTHORIZED).json({
        message: "Unauthorized",
      });
    }

    const { groupName, groupDescription, groupAvatar } = req.body;

    const updatedGroup = await updateGroupService(chatId, userId, {
      groupName,
      groupDescription,
      groupAvatar,
    });

    return res.status(HTTPSTATUS.OK).json({
      message: "Group updated successfully",
      chat: updatedGroup,
    });
  }
);

export const addGroupMemberController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { chatId } = req.params;
    const { memberId } = req.body;

    if (!userId) {
      return res.status(HTTPSTATUS.UNAUTHORIZED).json({
        message: "Unauthorized",
      });
    }

    const updatedGroup = await addGroupMemberService(chatId, userId, memberId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Member added successfully",
      chat: updatedGroup,
    });
  }
);

export const removeGroupMemberController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { chatId, memberId } = req.params;

    if (!userId) {
      return res.status(HTTPSTATUS.UNAUTHORIZED).json({
        message: "Unauthorized",
      });
    }

    const updatedGroup = await removeGroupMemberService(chatId, userId, memberId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Member removed successfully",
      chat: updatedGroup,
    });
  }
);

export const leaveGroupController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { chatId } = req.params;

    if (!userId) {
      return res.status(HTTPSTATUS.UNAUTHORIZED).json({
        message: "Unauthorized",
      });
    }

    const result = await leaveGroupService(chatId, userId);

    return res.status(HTTPSTATUS.OK).json(result);
  }
);
