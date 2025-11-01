import { supabase, UserWithoutPassword } from "../config/supabase.config";
import cloudinary from "../config/cloudinary.config";
import { BadRequestException } from "../utils/app-error";

export const findByIdUserService = async (userId: string): Promise<UserWithoutPassword | null> => {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, avatar, username, bio, role, is_ai, created_at, updated_at')
    .eq('id', userId)
    .single();
    
  if (error || !user) {
    return null;
  }
  
  return user;
};

export const getUsersService = async (userId: string): Promise<UserWithoutPassword[]> => {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, email, avatar, username, bio, role, is_ai, created_at, updated_at')
    .neq('id', userId);
    
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  
  return users || [];
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

  // Check if username is already taken by another user
  if (username) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .neq('id', userId)
      .single();

    if (existingUser) {
      throw new BadRequestException('Username is already taken');
    }
  }

  let avatarUrl = avatar;

  // Upload avatar to Cloudinary if provided
  if (avatar && avatar.startsWith('data:image')) {
    try {
      const uploadRes = await cloudinary.uploader.upload(avatar, {
        folder: 'chat-app/avatars',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' }
        ]
      });
      avatarUrl = uploadRes.secure_url;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw new Error('Failed to upload avatar');
    }
  }

  // Update user profile
  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  if (name !== undefined) updateData.name = name;
  if (username !== undefined) updateData.username = username;
  if (bio !== undefined) updateData.bio = bio;
  if (role !== undefined) updateData.role = role;
  if (avatarUrl && avatarUrl !== avatar) updateData.avatar = avatarUrl;

  const { data: updatedUser, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select('id, name, email, avatar, username, bio, role, is_ai, created_at, updated_at')
    .single();

  if (error || !updatedUser) {
    console.error('Error updating profile:', error);
    throw new Error('Failed to update profile');
  }

  return updatedUser;
};
