import cloudinary from "../config/cloudinary.config";
import { supabase, Message, MessageWithSender, Chat } from "../config/supabase.config";
import { BadRequestException, NotFoundException } from "../utils/app-error";
import {
  emitLastMessageToParticipants,
  emitNewMessageToChatRoom,
} from "../lib/socket";

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

  // Check if user is a participant in this chat
  const { data: participation } = await supabase
    .from('chat_participants')
    .select('id')
    .eq('chat_id', chatId)
    .eq('user_id', userId)
    .single();
    
  if (!participation) {
    throw new BadRequestException("Chat not found or unauthorized");
  }

  // Validate reply message if provided
  if (replyToId) {
    const { data: replyMessage } = await supabase
      .from('messages')
      .select('id')
      .eq('id', replyToId)
      .eq('chat_id', chatId)
      .single();
      
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
    // Upload the audio/voice note to cloudinary
    const uploadRes = await cloudinary.uploader.upload(audio, {
      resource_type: 'auto',
      folder: 'chat-app/audio'
    });
    audioUrl = uploadRes.secure_url;
  }

  // Create new message
  const { data: newMessage, error: messageError } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: userId,
      content: content || null,
      image: imageUrl || null,
      audio: audioUrl || null,
      reply_to_id: replyToId || null,
    })
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
    .single();

  if (messageError || !newMessage) {
    console.error('Error creating message:', messageError);
    throw new Error('Failed to create message');
  }

  // Update chat's last message
  const { error: chatUpdateError } = await supabase
    .from('chats')
    .update({ 
      last_message_id: newMessage.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', chatId);

  if (chatUpdateError) {
    console.error('Error updating chat last message:', chatUpdateError);
  }

  // Get chat details for websocket
  const { data: chat } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .single();

  // Get all participant IDs for websocket
  const { data: participants } = await supabase
    .from('chat_participants')
    .select('user_id')
    .eq('chat_id', chatId);

  const allParticipantIds = participants?.map((p: any) => p.user_id) || [];

  // Websocket emit the new message to the chat room
  emitNewMessageToChatRoom(userId, chatId, newMessage);

  // Websocket emit the last message to members (personal room user)
  emitLastMessageToParticipants(allParticipantIds, chatId, newMessage);

  return {
    userMessage: newMessage,
    chat,
  };
};
