import { z } from "zod";

export const EmailCreateSchema = z.object({
  recipient: z.string().email(),
  subject: z.string().trim().min(1).max(255),
  body: z.string().trim().min(1).max(10000),
  source: z.string().trim().min(1).max(100),
  sender: z.string().email().optional(),
});

export const EmailQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  recipient: z.string().email().optional(),
  source: z.string().trim().min(1).max(100).optional(),
});
