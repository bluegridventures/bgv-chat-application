import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { HTTPSTATUS } from "../config/http.config";
import { getUsersService, updateProfileService, findByIdUserService } from "../services/user.service";

export const getUsersController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    const users = await getUsersService(userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Users retrieved successfully",
      users,
    });
  }
);

export const getUserByIdController = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params;

    const user = await findByIdUserService(userId);

    if (!user) {
      return res.status(HTTPSTATUS.NOT_FOUND).json({
        message: "User not found",
      });
    }

    return res.status(HTTPSTATUS.OK).json({
      message: "User retrieved successfully",
      user,
    });
  }
);

export const updateProfileController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(HTTPSTATUS.UNAUTHORIZED).json({
        message: "Unauthorized",
      });
    }

    const updatedUser = await updateProfileService(userId, req.body);

    return res.status(HTTPSTATUS.OK).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  }
);
