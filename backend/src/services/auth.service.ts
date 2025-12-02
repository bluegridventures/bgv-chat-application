import { prisma } from "../config/prisma.config";
import type { UserWithoutPassword } from "../types/db.types";
import { NotFoundException, UnauthorizedException } from "../utils/app-error";
import { compareValue, hashValue } from "../utils/bcrypt";
import {
  LoginSchemaType,
  RegisterSchemaType,
} from "../validators/auth.validator";

export const registerService = async (
  body: RegisterSchemaType
): Promise<UserWithoutPassword> => {
  const { email, name, password, avatar } = body;

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new UnauthorizedException("User already exist");
  }

  const hashedPassword = await hashValue(password);

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      avatar: avatar || null,
      is_ai: false,
    },
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

  return newUser;
};

export const loginService = async (
  body: LoginSchemaType
): Promise<UserWithoutPassword> => {
  const { email, password } = body;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new NotFoundException("Email or Password not found");
  }

  const isPasswordValid = await compareValue(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedException("Invalid email or password");
  }

  const { password: _pw, ...userWithoutPassword } = user;

  return {
    ...userWithoutPassword,
  } as UserWithoutPassword;
};
