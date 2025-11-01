import { supabase } from "../config/supabase.config";
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

  // Create group chat
  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .insert({
      is_group: true,
      group_name: groupName,
      group_description: groupDescription || null,
      group_avatar: avatarUrl || null,
      group_admin_id: createdBy,
      created_by: createdBy,
    })
    .select()
    .single();

  if (chatError || !chat) {
    console.error('Error creating group chat:', chatError);
    throw new Error('Failed to create group');
  }

  // Add participants
  const participantsData = allParticipants.map(userId => ({
    chat_id: chat.id,
    user_id: userId,
  }));

  const { error: participantsError } = await supabase
    .from('chat_participants')
    .insert(participantsData);

  if (participantsError) {
    console.error('Error adding participants:', participantsError);
    // Rollback: delete the chat
    await supabase.from('chats').delete().eq('id', chat.id);
    throw new Error('Failed to add participants to group');
  }

  // Fetch complete group data with participants
  const { data: completeChat, error: fetchError } = await supabase
    .from('chats')
    .select(`
      *,
      participants:chat_participants(
        user:users(id, name, email, avatar, username, bio, role, is_ai)
      )
    `)
    .eq('id', chat.id)
    .single();

  if (fetchError || !completeChat) {
    throw new Error('Failed to fetch created group');
  }

  return completeChat;
};

export const updateGroupService = async (
  chatId: string,
  userId: string,
  data: UpdateGroupData
) => {
  // Check if chat exists and is a group
  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .single();

  if (chatError || !chat) {
    throw new NotFoundException('Group not found');
  }

  if (!chat.is_group) {
    throw new BadRequestException('This is not a group chat');
  }

  // Check if user is admin
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

  // Update group
  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  if (groupName !== undefined) updateData.group_name = groupName;
  if (groupDescription !== undefined) updateData.group_description = groupDescription;
  if (avatarUrl && avatarUrl !== groupAvatar) updateData.group_avatar = avatarUrl;

  const { data: updatedChat, error: updateError } = await supabase
    .from('chats')
    .update(updateData)
    .eq('id', chatId)
    .select(`
      *,
      participants:chat_participants(
        user:users(id, name, email, avatar, username, bio, role, is_ai)
      )
    `)
    .single();

  if (updateError || !updatedChat) {
    console.error('Error updating group:', updateError);
    throw new Error('Failed to update group');
  }

  return updatedChat;
};

export const addGroupMemberService = async (
  chatId: string,
  userId: string,
  newMemberId: string
) => {
  // Check if chat exists and is a group
  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .single();

  if (chatError || !chat) {
    throw new NotFoundException('Group not found');
  }

  if (!chat.is_group) {
    throw new BadRequestException('This is not a group chat');
  }

  // Check if user is admin
  if (chat.group_admin_id !== userId) {
    throw new ForbiddenException('Only group admin can add members');
  }

  // Check if new member already exists
  const { data: existingMember } = await supabase
    .from('chat_participants')
    .select('*')
    .eq('chat_id', chatId)
    .eq('user_id', newMemberId)
    .single();

  if (existingMember) {
    throw new BadRequestException('User is already a member of this group');
  }

  // Add new member
  const { error: addError } = await supabase
    .from('chat_participants')
    .insert({
      chat_id: chatId,
      user_id: newMemberId,
    });

  if (addError) {
    console.error('Error adding member:', addError);
    throw new Error('Failed to add member to group');
  }

  // Fetch updated group
  const { data: updatedChat, error: fetchError } = await supabase
    .from('chats')
    .select(`
      *,
      participants:chat_participants(
        user:users(id, name, email, avatar, username, bio, role, is_ai)
      )
    `)
    .eq('id', chatId)
    .single();

  if (fetchError || !updatedChat) {
    throw new Error('Failed to fetch updated group');
  }

  return updatedChat;
};

export const removeGroupMemberService = async (
  chatId: string,
  userId: string,
  memberIdToRemove: string
) => {
  // Check if chat exists and is a group
  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .single();

  if (chatError || !chat) {
    throw new NotFoundException('Group not found');
  }

  if (!chat.is_group) {
    throw new BadRequestException('This is not a group chat');
  }

  // Check if user is admin
  if (chat.group_admin_id !== userId) {
    throw new ForbiddenException('Only group admin can remove members');
  }

  // Cannot remove admin
  if (memberIdToRemove === chat.group_admin_id) {
    throw new BadRequestException('Cannot remove group admin');
  }

  // Remove member
  const { error: removeError } = await supabase
    .from('chat_participants')
    .delete()
    .eq('chat_id', chatId)
    .eq('user_id', memberIdToRemove);

  if (removeError) {
    console.error('Error removing member:', removeError);
    throw new Error('Failed to remove member from group');
  }

  // Fetch updated group
  const { data: updatedChat, error: fetchError } = await supabase
    .from('chats')
    .select(`
      *,
      participants:chat_participants(
        user:users(id, name, email, avatar, username, bio, role, is_ai)
      )
    `)
    .eq('id', chatId)
    .single();

  if (fetchError || !updatedChat) {
    throw new Error('Failed to fetch updated group');
  }

  return updatedChat;
};

export const leaveGroupService = async (chatId: string, userId: string) => {
  // Check if chat exists and is a group
  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .single();

  if (chatError || !chat) {
    throw new NotFoundException('Group not found');
  }

  if (!chat.is_group) {
    throw new BadRequestException('This is not a group chat');
  }

  // Admin cannot leave (must transfer admin first)
  if (chat.group_admin_id === userId) {
    throw new BadRequestException('Admin must transfer admin rights before leaving');
  }

  // Remove user from group
  const { error: removeError } = await supabase
    .from('chat_participants')
    .delete()
    .eq('chat_id', chatId)
    .eq('user_id', userId);

  if (removeError) {
    console.error('Error leaving group:', removeError);
    throw new Error('Failed to leave group');
  }

  return { message: 'Successfully left the group' };
};
