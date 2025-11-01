import { supabase, User, UserWithoutPassword } from "../config/supabase.config";
import { NotFoundException, UnauthorizedException } from "../utils/app-error";
import { compareValue, hashValue } from "../utils/bcrypt";
import {
  LoginSchemaType,
  RegisterSchemaType,
} from "../validators/auth.validator";

export const registerService = async (body: RegisterSchemaType): Promise<UserWithoutPassword> => {
  const { email, name, password, avatar } = body;
  
  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();
    
  if (existingUser) throw new UnauthorizedException("User already exist");
  
  // Hash password
  const hashedPassword = await hashValue(password);
  
  // Create new user
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      name,
      email,
      password: hashedPassword,
      avatar: avatar || null,
      is_ai: false
    })
    .select('id, name, email, avatar, is_ai, created_at, updated_at')
    .single();
    
  if (error) {
    console.error('Error creating user:', error);
    throw new Error('Failed to create user');
  }
  
  return newUser;
};

export const loginService = async (body: LoginSchemaType): Promise<UserWithoutPassword> => {
  const { email, password } = body;

  // Get user with password for validation
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
    
  if (error || !user) {
    throw new NotFoundException("Email or Password not found");
  }

  // Compare password
  const isPasswordValid = await compareValue(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedException("Invalid email or password");
  }

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
