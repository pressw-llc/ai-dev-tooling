import { z } from 'zod';

export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.date().optional(),
});

export type Message = z.infer<typeof MessageSchema>;

export const ChatConfigSchema = z.object({
  apiKey: z.string(),
  baseUrl: z.string().url().optional(),
  timeout: z.number().positive().optional(),
});

export type ChatConfig = z.infer<typeof ChatConfigSchema>;
