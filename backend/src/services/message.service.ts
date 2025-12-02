import cloudinary from "../config/cloudinary.config";
import { prisma } from "../config/prisma.config";
import { BadRequestException, NotFoundException } from "../utils/app-error";
import {
  emitLastMessageToParticipants,
  emitMessageDeletedToChatRoom,
  emitMessageUpdatedToChatRoom,
  emitNewMessageToChatRoom,
} from "../lib/socket";

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

export const sendMessageService = async (
  userId: string,
  body: {
    chatId: string;
    content?: string;
    image?: string;
    audio?: string;
    replyToId?: string;
  }
) => {
  const { chatId, content, image, audio, replyToId } = body;

  const participation = await prisma.chatParticipant.findFirst({
    where: {
      chat_id: chatId,
      user_id: userId,
    },
  });

  if (!participation) {
    throw new BadRequestException("Chat not found or unauthorized");
  }

  if (replyToId) {
    const replyMessage = await prisma.message.findFirst({
      where: {
        id: replyToId,
        chat_id: chatId,
      },
      select: { id: true },
    });

    if (!replyMessage) {
      throw new NotFoundException("Reply message not found");
    }
  }

  let imageUrl;
  let audioUrl;

  if (image) {
    // Upload the image to cloudinary
    const uploadRes = await cloudinary.uploader.upload(image);
    imageUrl = uploadRes.secure_url;
  }

  if (audio) {
    const uploadRes = await cloudinary.uploader.upload(audio, {
      resource_type: 'auto',
      folder: 'chat-app/audio'
    });
    audioUrl = uploadRes.secure_url;
  }

  const newMessage = await prisma.message.create({
    data: {
      chat_id: chatId,
      sender_id: userId,
      content: content || null,
      image: imageUrl || null,
      audio: audioUrl || null,
      reply_to_id: replyToId || null,
    },
    include: {
      sender: {
        select: selectUserWithoutPassword,
      },
      replyTo: {
        include: {
          sender: {
            select: selectUserWithoutPassword,
          },
        },
      },
    },
  });

  await prisma.chat.update({
    where: { id: chatId },
    data: {
      last_message_id: newMessage.id,
      updated_at: new Date(),
    },
  });

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
  });

  const participants = await prisma.chatParticipant.findMany({
    where: { chat_id: chatId },
    select: { user_id: true },
  });

  const allParticipantIds = participants.map(
    (p: { user_id: string }) => p.user_id
  );

  emitNewMessageToChatRoom(userId, chatId, newMessage);

  emitLastMessageToParticipants(allParticipantIds, chatId, newMessage);

  return {
    userMessage: newMessage,
    chat,
  };
};

export const reactToMessageService = async (
  userId: string,
  body: { chatId: string; messageId: string; emoji: string }
) => {
  const { chatId, messageId, emoji } = body;

  const participation = await prisma.chatParticipant.findFirst({
    where: { chat_id: chatId, user_id: userId },
  });

  if (!participation) {
    throw new BadRequestException("Chat not found or unauthorized");
  }

  const message = await prisma.message.findFirst({
    where: { id: messageId, chat_id: chatId },
    select: { id: true },
  });

  if (!message) {
    throw new NotFoundException("Message not found");
  }

  const existing = await prisma.messageReaction.findFirst({
    where: {
      message_id: messageId,
      user_id: userId,
    },
  });

  if (existing && existing.emoji === emoji) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
  } else if (existing) {
    await prisma.messageReaction.update({
      where: { id: existing.id },
      data: { emoji },
    });
  } else {
    await prisma.messageReaction.create({
      data: {
        message_id: messageId,
        user_id: userId,
        emoji,
      },
    });
  }

  const updatedMessage = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      sender: {
        select: selectUserWithoutPassword,
      },
      replyTo: {
        include: {
          sender: {
            select: selectUserWithoutPassword,
          },
        },
      },
      reactions: {
        include: {
          user: {
            select: selectUserWithoutPassword,
          },
        },
      },
    },
  });

  if (updatedMessage) {
    emitMessageUpdatedToChatRoom(chatId, updatedMessage);
  }

  return { updatedMessage };
};

export const editMessageService = async (
  userId: string,
  body: { chatId: string; messageId: string; content: string }
) => {
  const { chatId, messageId, content } = body;

  const message = await prisma.message.findUnique({ where: { id: messageId } });

  if (!message || message.chat_id !== chatId) {
    throw new NotFoundException("Message not found");
  }

  if (message.sender_id !== userId) {
    throw new BadRequestException("You can only edit your own messages");
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { content },
    include: {
      sender: {
        select: selectUserWithoutPassword,
      },
      replyTo: {
        include: {
          sender: {
            select: selectUserWithoutPassword,
          },
        },
      },
      reactions: {
        include: {
          user: {
            select: selectUserWithoutPassword,
          },
        },
      },
    },
  });

  emitMessageUpdatedToChatRoom(chatId, updated);

  return { updatedMessage: updated };
};

export const deleteMessageService = async (
  userId: string,
  body: { chatId: string; messageId: string }
) => {
  const { chatId, messageId } = body;

  const message = await prisma.message.findUnique({ where: { id: messageId } });

  if (!message || message.chat_id !== chatId) {
    throw new NotFoundException("Message not found");
  }

  if (message.sender_id !== userId) {
    throw new BadRequestException("You can only delete your own messages");
  }

  const chat = await prisma.chat.findUnique({ where: { id: chatId } });

  await prisma.messageReaction.deleteMany({ where: { message_id: messageId } });
  await prisma.message.delete({ where: { id: messageId } });

  if (chat?.last_message_id === messageId) {
    const last = await prisma.message.findFirst({
      where: { chat_id: chatId },
      orderBy: { created_at: "desc" },
      include: {
        sender: {
          select: selectUserWithoutPassword,
        },
      },
    });

    await prisma.chat.update({
      where: { id: chatId },
      data: {
        last_message_id: last ? last.id : null,
        updated_at: new Date(),
      },
    });

    if (last) {
      const participants = await prisma.chatParticipant.findMany({
        where: { chat_id: chatId },
        select: { user_id: true },
      });
      const allParticipantIds = participants.map((p: { user_id: string }) => p.user_id);
      emitLastMessageToParticipants(allParticipantIds, chatId, last);
    }
  }

  emitMessageDeletedToChatRoom(chatId, messageId);

  return { success: true };
};
