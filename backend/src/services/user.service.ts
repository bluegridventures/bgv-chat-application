import { prisma } from "../config/prisma.config";
import type { UserWithoutPassword } from "../types/db.types";
import cloudinary from "../config/cloudinary.config";
import { BadRequestException } from "../utils/app-error";

export const findByIdUserService = async (
  userId: string
): Promise<UserWithoutPassword | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      username: true,
      bio: true,
      role: true,
      is_ai: true,
      created_at: true,
      updated_at: true,
    },
  });

  return user ?? null;
};

export const getUsersService = async (
  userId: string
): Promise<UserWithoutPassword[]> => {
  const users = await prisma.user.findMany({
    where: { id: { not: userId } },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      username: true,
      bio: true,
      role: true,
      is_ai: true,
      created_at: true,
      updated_at: true,
    },
  });

  return users;
};

export const updateProfileService = async (
  userId: string,
  body: {
    name?: string;
    username?: string;
    bio?: string;
    role?: string;
    avatar?: string;
  }
): Promise<UserWithoutPassword> => {
  const { name, username, bio, role, avatar } = body;

  if (username) {
    const existingUser = await prisma.user.findFirst({
      where: {
        username,
        id: { not: userId },
      },
      select: { id: true },
    });

    if (existingUser) {
      throw new BadRequestException("Username is already taken");
    }
  }

  let avatarUrl = avatar;

  if (avatar && avatar.startsWith("data:image")) {
    try {
      const uploadRes = await cloudinary.uploader.upload(avatar, {
        folder: "chat-app/avatars",
        transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
      });
      avatarUrl = uploadRes.secure_url;
    } catch (error) {
      console.error("Error uploading avatar:", error);
      throw new Error("Failed to upload avatar");
    }
  }

  const updateData: any = {};

  if (name !== undefined) updateData.name = name;
  if (username !== undefined) updateData.username = username;
  if (bio !== undefined) updateData.bio = bio;
  if (role !== undefined) updateData.role = role;
  if (avatarUrl && avatarUrl !== avatar) updateData.avatar = avatarUrl;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      username: true,
      bio: true,
      role: true,
      is_ai: true,
      created_at: true,
      updated_at: true,
    },
  });

  return updatedUser;
};
