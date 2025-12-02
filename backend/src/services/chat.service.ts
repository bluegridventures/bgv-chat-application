import { emitNewChatToParticpants } from "../lib/socket";
import { prisma } from "../config/prisma.config";
import type {
  ChatWithParticipants,
  MessageWithSender,
  UserWithoutPassword,
  Chat as ChatDTO,
} from "../types/db.types";
import { BadRequestException, NotFoundException } from "../utils/app-error";

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

// Helper function to get chat with participants and last message
export const getChatWithParticipants = async (
  chatId: string
): Promise<ChatWithParticipants> => {
  const chat = await prisma.chat.findUnique({
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

  if (!chat) {
    throw new Error("Chat not found");
  }

  let lastMessage: MessageWithSender | null = null;
  if (chat.last_message_id) {
    const message = await prisma.message.findUnique({
      where: { id: chat.last_message_id },
      include: {
        sender: {
          select: selectUserWithoutPassword,
        },
      },
    });

    if (message) {
      lastMessage = message as unknown as MessageWithSender;
    }
  }

  const participants = (chat.participants as { user: UserWithoutPassword }[]).map(
    (p: { user: UserWithoutPassword }) => p.user
  );

  return {
    id: chat.id,
    is_group: chat.is_group,
    group_name: chat.group_name,
    group_description: chat.group_description,
    group_avatar: chat.group_avatar,
    group_admin_id: chat.group_admin_id,
    created_by: chat.created_by,
    last_message_id: chat.last_message_id ?? null,
    created_at: chat.created_at,
    updated_at: chat.updated_at,
    participants,
    lastMessage,
  };
};

export const createChatService = async (
  userId: string,
  body: {
    participantId?: string;
    isGroup?: boolean;
    participants?: string[];
    groupName?: string;
  }
): Promise<ChatWithParticipants> => {
  const { participantId, isGroup, participants, groupName } = body;

  try {
    if (!isGroup && participantId) {
      if (participantId === userId) {
        throw new BadRequestException("Cannot create chat with yourself");
      }

      const otherUser = await prisma.user.findUnique({
        where: { id: participantId },
        select: { id: true },
      });

      if (!otherUser) {
        throw new NotFoundException("Participant not found");
      }

      const existingChat = await prisma.chat.findFirst({
        where: {
          is_group: false,
          AND: [
            { participants: { some: { user_id: userId } } },
            { participants: { some: { user_id: participantId } } },
          ],
        },
      });

      if (existingChat) {
        return getChatWithParticipants(existingChat.id);
      }

      return await createNewChat(userId, {
        isGroup: false,
        participantIds: [userId, participantId],
      });
    }

    if (isGroup) {
      if (!participants?.length || !groupName) {
        throw new BadRequestException(
          "Group chat requires participants and group name"
        );
      }

      const uniqueParticipants = Array.from(new Set([...participants, userId]));

      return await createNewChat(userId, {
        isGroup: true,
        participantIds: uniqueParticipants,
        groupName,
      });
    }

    throw new BadRequestException("Invalid chat creation parameters");
  } catch (error) {
    console.error("Error in createChatService:", error);
    throw error;
  }
};

// Helper function to create a new chat
const createNewChat = async (
  userId: string, 
  options: {
    isGroup: boolean;
    participantIds: string[];
    groupName?: string;
  }
): Promise<ChatWithParticipants> => {
  const { isGroup, participantIds, groupName } = options;

  const chat = await prisma.chat.create({
    data: {
      is_group: isGroup,
      group_name: isGroup ? groupName ?? null : null,
      group_admin_id: isGroup ? userId : null,
      created_by: userId,
    },
  });

  await prisma.chatParticipant.createMany({
    data: participantIds.map((id) => ({
      chat_id: chat.id,
      user_id: id,
    })),
    skipDuplicates: true,
  });

  const chatWithParticipants = await getChatWithParticipants(chat.id);

  emitNewChatToParticpants(participantIds, chatWithParticipants);

  return chatWithParticipants;
};

export const getUserChatsService = async (
  userId: string
): Promise<ChatWithParticipants[]> => {
  const memberships = await prisma.chatParticipant.findMany({
    where: { user_id: userId },
    select: { chat_id: true },
  });

  if (!memberships.length) {
    return [];
  }

  const chatIds = Array.from(
    new Set<string>(memberships.map((m: { chat_id: string }) => m.chat_id))
  );

  const chats = await Promise.all(chatIds.map((id) => getChatWithParticipants(id)));

  return chats.sort(
    (a, b) =>
      new Date(b.updated_at as any).getTime() -
      new Date(a.updated_at as any).getTime()
  );
};

export const getSingleChatService = async (chatId: string, userId: string) => {
  try {
    console.log(`Fetching chat ${chatId} for user ${userId}`);
    
    const chat = await validateChatParticipant(chatId, userId);
    console.log("Chat validation passed:", chat.id);

    const messages = await prisma.message.findMany({
      where: { chat_id: chatId },
      orderBy: { created_at: "desc" },
      take: 50,
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

    console.log(`Fetched ${messages.length} messages`);

    const chatWithParticipants = await getChatWithParticipants(chatId);

    if (!chatWithParticipants) {
      throw new NotFoundException("Chat not found");
    }

    console.log("Chat with participants retrieved successfully");

    return {
      chat: chatWithParticipants,
      messages: messages.reverse(),
    };
  } catch (error) {
    console.error("Error in getSingleChatService:", error);
    throw error;
  }
};

export const validateChatParticipant = async (
  chatId: string,
  userId: string
): Promise<ChatDTO> => {
  const participation = await prisma.chatParticipant.findFirst({
    where: {
      chat_id: chatId,
      user_id: userId,
    },
  });

  if (!participation) {
    console.error(`User ${userId} is not a participant in chat ${chatId}`);
    throw new BadRequestException(
      "Chat not found or you are not authorized to view this chat"
    );
  }

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
  });

  if (!chat) {
    console.error("Chat fetch error: chat not found");
    throw new BadRequestException("Chat not found");
  }

  return chat as unknown as ChatDTO;
};

export const deleteChatService = async (chatId: string, userId: string) => {
  const isParticipant = await validateChatParticipant(chatId, userId);

  if (!isParticipant) {
    throw new BadRequestException(
      "You are not authorized to delete this chat"
    );
  }

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
  });

  if (!chat) {
    throw new NotFoundException("Chat not found");
  }

  if (chat.is_group && chat.group_admin_id !== userId) {
    await prisma.chatParticipant.deleteMany({
      where: {
        chat_id: chatId,
        user_id: userId,
      },
    });

    return { message: "Successfully left the group" };
  }

  await prisma.message.deleteMany({
    where: { chat_id: chatId },
  });

  await prisma.chatParticipant.deleteMany({
    where: { chat_id: chatId },
  });

  await prisma.chat.delete({
    where: { id: chatId },
  });

  return { message: "Chat deleted successfully" };
};
