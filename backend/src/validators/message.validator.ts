import { z } from "zod";

export const sendMessageSchema = z
  .object({
    chatId: z.string().trim().min(1),
    content: z.string().trim().optional(),
    image: z.string().trim().optional(),
    audio: z.string().trim().optional(),
    replyToId: z.string().trim().optional(),
  })
  .refine((data) => data.content || data.image || data.audio, {
    message: "Either content, image or audio must be provided",
    path: ["content"],
  });
