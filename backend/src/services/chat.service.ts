import { emitNewChatToParticpants } from "../lib/socket";
import { supabase, Chat, ChatWithParticipants, UserWithoutPassword, MessageWithSender } from "../config/supabase.config";
import { BadRequestException, NotFoundException } from "../utils/app-error";

// Helper function to get chat with participants and last message
const getChatWithParticipants = async (chatId: string): Promise<ChatWithParticipants> => {
  // Get chat details
  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .single();
    
  if (chatError || !chat) {
    throw new Error('Chat not found');
  }
  
  // Get participants
  const { data: participants, error: participantsError } = await supabase
    .from('chat_participants')
    .select(`
      users!inner(
        id,
        name,
        email,
        avatar,
        is_ai,
        created_at,
        updated_at
      )
    `)
    .eq('chat_id', chatId);
    
  if (participantsError) {
    throw new Error('Failed to get chat participants');
  }
  
  // Get last message if exists
  let lastMessage: MessageWithSender | null = null;
  if (chat.last_message_id) {
    const { data: message } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(
          id,
          name,
          email,
          avatar,
          is_ai,
          created_at,
          updated_at
        )
      `)
      .eq('id', chat.last_message_id)
      .single();
      
    if (message) {
      lastMessage = message as MessageWithSender;
    }
  }
  
  return {
    ...chat,
    participants: participants?.map((p: any) => p.users) || [],
    lastMessage
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
    // Handle one-on-one chat
    if (!isGroup && participantId) {
      if (participantId === userId) {
        throw new BadRequestException('Cannot create chat with yourself');
      }
      
      // Check if other user exists
      const { data: otherUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', participantId)
        .single();
        
      if (userError || !otherUser) {
        throw new NotFoundException('Participant not found');
      }
      
      // Check if chat already exists between these users
      const { data: existingChats, error: chatError } = await supabase
        .rpc('get_direct_chat', {
          user1_id: userId,
          user2_id: participantId
        });
      
      if (existingChats && existingChats.length > 0) {
        return getChatWithParticipants(existingChats[0].id);
      }
      
      // Create new one-on-one chat
      return await createNewChat(userId, {
        isGroup: false,
        participantIds: [userId, participantId]
      });
    }
    
    // Handle group chat
    if (isGroup) {
      if (!participants?.length || !groupName) {
        throw new BadRequestException('Group chat requires participants and group name');
      }
      
      // Ensure unique participants and include current user
      const uniqueParticipants = Array.from(new Set([...participants, userId]));
      
      return await createNewChat(userId, {
        isGroup: true,
        participantIds: uniqueParticipants,
        groupName
      });
    }
    
    throw new BadRequestException('Invalid chat creation parameters');
  } catch (error) {
    console.error('Error in createChatService:', error);
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
  
  // Create new chat
  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .insert({
      is_group: isGroup,
      group_name: isGroup ? groupName : null,
      created_by: userId
    })
    .select()
    .single();
    
  if (chatError || !chat) {
    console.error('Failed to create chat:', chatError);
    throw new Error('Failed to create chat');
  }
  
  // Add participants
  const participantInserts = participantIds.map(id => ({
    chat_id: chat.id,
    user_id: id,
    created_at: new Date().toISOString()
  }));
  
  const { error: participantsError } = await supabase
    .from('chat_participants')
    .insert(participantInserts);
    
  if (participantsError) {
    console.error('Failed to add participants:', participantsError);
    throw new Error('Failed to add participants to chat');
  }
  
  // Get chat with participants
  const chatWithParticipants = await getChatWithParticipants(chat.id);
  
  // Emit websocket event
  if (chatWithParticipants) {
    emitNewChatToParticpants(participantIds, chatWithParticipants);
  }
  
  return chatWithParticipants;
};

export const getUserChatsService = async (userId: string): Promise<ChatWithParticipants[]> => {
  // Get all chats where user is a participant
  const { data: userChats, error } = await supabase
    .from('chat_participants')
    .select(`
      chat_id,
      chats!inner(
        id,
        is_group,
        group_name,
        created_by,
        last_message_id,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', userId);
    
  if (error || !userChats) {
    console.error('Error fetching user chats:', error);
    return [];
  }
  
  // Get full chat details with participants and last messages
  const chatPromises = userChats.map(async (uc: any) => {
    const chat = uc.chats;
    return await getChatWithParticipants(chat.id);
  });
  
  const chats = await Promise.all(chatPromises);
  
  // Sort by updated_at descending
  return chats.sort((a: ChatWithParticipants, b: ChatWithParticipants) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
};

export const getSingleChatService = async (chatId: string, userId: string) => {
  try {
    console.log(`Fetching chat ${chatId} for user ${userId}`);
    
    // First verify the user has access to this chat
    const chat = await validateChatParticipant(chatId, userId);
    console.log('Chat validation passed:', chat.id);
    
    // Get messages for this chat
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(
          id,
          name,
          email,
          avatar,
          is_ai,
          created_at,
          updated_at
        )
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      throw new Error('Failed to fetch messages');
    }
    
    console.log(`Fetched ${messages?.length || 0} messages`);
    
    // Get chat with participants
    const chatWithParticipants = await getChatWithParticipants(chatId);
    
    if (!chatWithParticipants) {
      throw new NotFoundException('Chat not found');
    }
    
    console.log('Chat with participants retrieved successfully');
    
    return {
      chat: chatWithParticipants,
      messages: messages?.reverse() || [] // Return messages in chronological order
    };
  } catch (error) {
    console.error('Error in getSingleChatService:', error);
    throw error;
  }
};

export const validateChatParticipant = async (
  chatId: string,
  userId: string
): Promise<Chat> => {
  // Check if user is a participant in this chat
  const { data: participation, error: participationError } = await supabase
    .from('chat_participants')
    .select('id')
    .eq('chat_id', chatId)
    .eq('user_id', userId)
    .single();
    
  if (participationError) {
    console.error('Participation check error:', participationError);
  }
    
  if (!participation) {
    console.error(`User ${userId} is not a participant in chat ${chatId}`);
    throw new BadRequestException("Chat not found or you are not authorized to view this chat");
  }
  
  // Get chat details
  const { data: chat, error } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .single();
    
  if (error || !chat) {
    console.error('Chat fetch error:', error);
    throw new BadRequestException("Chat not found");
  }
  
  return chat;
};

export const deleteChatService = async (chatId: string, userId: string) => {
  // Check if user is a participant
  const isParticipant = await validateChatParticipant(chatId, userId);
  
  if (!isParticipant) {
    throw new BadRequestException("You are not authorized to delete this chat");
  }

  // Get chat details to check if it's a group
  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .single();

  if (chatError || !chat) {
    throw new NotFoundException('Chat not found');
  }

  // For groups, only admin can delete the entire group
  // For regular users, they can only leave the group (remove themselves)
  if (chat.is_group && chat.group_admin_id !== userId) {
    // Instead of deleting the group, just remove the user from it
    const { error: removeParticipantError } = await supabase
      .from('chat_participants')
      .delete()
      .eq('chat_id', chatId)
      .eq('user_id', userId);

    if (removeParticipantError) {
      console.error('Error removing user from group:', removeParticipantError);
      throw new Error('Failed to leave group');
    }

    return { message: 'Successfully left the group' };
  }

  // Delete messages first (cascade should handle this, but being explicit)
  const { error: messagesError } = await supabase
    .from('messages')
    .delete()
    .eq('chat_id', chatId);

  if (messagesError) {
    console.error('Error deleting messages:', messagesError);
  }

  // Delete chat participants
  const { error: participantsError } = await supabase
    .from('chat_participants')
    .delete()
    .eq('chat_id', chatId);

  if (participantsError) {
    console.error('Error deleting participants:', participantsError);
    throw new Error('Failed to delete chat participants');
  }

  // Delete the chat
  const { error: deleteChatError } = await supabase
    .from('chats')
    .delete()
    .eq('id', chatId);

  if (deleteChatError) {
    console.error('Error deleting chat:', deleteChatError);
    throw new Error('Failed to delete chat');
  }

  return { message: 'Chat deleted successfully' };
};
