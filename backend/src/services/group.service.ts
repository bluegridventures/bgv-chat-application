import { prisma } from "../config/prisma.config";
import cloudinary from "../config/cloudinary.config";
import { BadRequestException, ForbiddenException, NotFoundException } from "../utils/app-error";

interface CreateGroupData {
  groupName: string;
  groupDescription?: string;
  groupAvatar?: string;
  participantIds: string[];
  createdBy: string;
}

interface UpdateGroupData {
  groupName?: string;
  groupDescription?: string;
  groupAvatar?: string;
}

const selectUserWithoutPassword = {
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
};

export const createGroupService = async (data: CreateGroupData) => {
  const { groupName, groupDescription, groupAvatar, participantIds, createdBy } = data;

  // Validate group name
  if (!groupName || groupName.trim().length === 0) {
    throw new BadRequestException("Group name is required");
  }

  // Validate participants
  if (!participantIds || participantIds.length === 0) {
    throw new BadRequestException("At least one participant is required");
  }

  // Ensure creator is in participants
  const allParticipants = Array.from(new Set([createdBy, ...participantIds]));

  let avatarUrl = groupAvatar;

  // Upload group avatar to Cloudinary if provided
  if (groupAvatar && groupAvatar.startsWith('data:image')) {
    try {
      const uploadRes = await cloudinary.uploader.upload(groupAvatar, {
        folder: 'chat-app/groups',
        transformation: [
          { width: 400, height: 400, crop: 'fill' }
        ]
      });
      avatarUrl = uploadRes.secure_url;
    } catch (error) {
      console.error('Error uploading group avatar:', error);
      throw new Error('Failed to upload group avatar');
    }
  }

  try {
    const chat = await prisma.chat.create({
      data: {
        is_group: true,
        group_name: groupName,
        group_description: groupDescription || null,
        group_avatar: avatarUrl || null,
        group_admin_id: createdBy,
        created_by: createdBy,
      },
    });

    await prisma.chatParticipant.createMany({
      data: allParticipants.map((userId) => ({
        chat_id: chat.id,
        user_id: userId,
      })),
      skipDuplicates: true,
    });

    const completeChat = await prisma.chat.findUnique({
      where: { id: chat.id },
      include: {
        participants: {
          include: {
            user: {
              select: selectUserWithoutPassword,
            },
          },
        },
      },
    });

    if (!completeChat) {
      throw new Error("Failed to fetch created group");
    }

    return completeChat;
  } catch (error) {
    console.error("Error creating group:", error);
    throw new Error("Failed to create group");
  }
};

export const updateGroupService = async (
  chatId: string,
  userId: string,
  data: UpdateGroupData
) => {
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });

  if (!chat) {
    throw new NotFoundException('Group not found');
  }

  if (!chat.is_group) {
    throw new BadRequestException('This is not a group chat');
  }

  if (chat.group_admin_id !== userId) {
    throw new ForbiddenException('Only group admin can update group details');
  }

  const { groupName, groupDescription, groupAvatar } = data;
  let avatarUrl = groupAvatar;

  // Upload new avatar if provided
  if (groupAvatar && groupAvatar.startsWith('data:image')) {
    try {
      const uploadRes = await cloudinary.uploader.upload(groupAvatar, {
        folder: 'chat-app/groups',
        transformation: [
          { width: 400, height: 400, crop: 'fill' }
        ]
      });
      avatarUrl = uploadRes.secure_url;
    } catch (error) {
      console.error('Error uploading group avatar:', error);
      throw new Error('Failed to upload group avatar');
    }
  }

  const updateData: any = {};

  if (groupName !== undefined) updateData.group_name = groupName;
  if (groupDescription !== undefined) updateData.group_description = groupDescription;
  if (avatarUrl && avatarUrl !== groupAvatar) updateData.group_avatar = avatarUrl;

  const updatedChat = await prisma.chat.update({
    where: { id: chatId },
    data: updateData,
    include: {
      participants: {
        include: {
          user: {
            select: selectUserWithoutPassword,
          },
        },
      },
    },
  });

  return updatedChat;
};

export const addGroupMemberService = async (
  chatId: string,
  userId: string,
  newMemberId: string
) => {
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });

  if (!chat) {
    throw new NotFoundException('Group not found');
  }

  if (!chat.is_group) {
    throw new BadRequestException('This is not a group chat');
  }

  if (chat.group_admin_id !== userId) {
    throw new ForbiddenException('Only group admin can add members');
  }

  const existingMember = await prisma.chatParticipant.findFirst({
    where: {
      chat_id: chatId,
      user_id: newMemberId,
    },
    select: { id: true },
  });

  if (existingMember) {
    throw new BadRequestException('User is already a member of this group');
  }

  await prisma.chatParticipant.create({
    data: {
      chat_id: chatId,
      user_id: newMemberId,
    },
  });

  const updatedChat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      participants: {
        include: {
          user: {
            select: selectUserWithoutPassword,
          },
        },
      },
    },
  });

  if (!updatedChat) {
    throw new Error('Failed to fetch updated group');
  }

  return updatedChat;
};

export const removeGroupMemberService = async (
  chatId: string,
  userId: string,
  memberIdToRemove: string
) => {
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });

  if (!chat) {
    throw new NotFoundException('Group not found');
  }

  if (!chat.is_group) {
    throw new BadRequestException('This is not a group chat');
  }

  if (chat.group_admin_id !== userId) {
    throw new ForbiddenException('Only group admin can remove members');
  }

  if (memberIdToRemove === chat.group_admin_id) {
    throw new BadRequestException('Cannot remove group admin');
  }

  await prisma.chatParticipant.deleteMany({
    where: {
      chat_id: chatId,
      user_id: memberIdToRemove,
    },
  });

  const updatedChat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      participants: {
        include: {
          user: {
            select: selectUserWithoutPassword,
          },
        },
      },
    },
  });

  if (!updatedChat) {
    throw new Error('Failed to fetch updated group');
  }

  return updatedChat;
};

export const leaveGroupService = async (chatId: string, userId: string) => {
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });

  if (!chat) {
    throw new NotFoundException('Group not found');
  }

  if (!chat.is_group) {
    throw new BadRequestException('This is not a group chat');
  }

  if (chat.group_admin_id === userId) {
    throw new BadRequestException('Admin must transfer admin rights before leaving');
  }

  await prisma.chatParticipant.deleteMany({
    where: {
      chat_id: chatId,
      user_id: userId,
    },
  });

  return { message: 'Successfully left the group' };
};
