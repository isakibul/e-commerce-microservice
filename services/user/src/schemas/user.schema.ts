import { z } from "zod";

export const UserCreateSchema = z.object({
  authUserId: z.string().min(1),
  name: z.string().trim().min(2).max(50),
  email: z.string().email(),
  address: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(30).optional(),
});

export const UserUpdateSchema = UserCreateSchema.omit({
  authUserId: true,
}).partial();

export const UserLookupQuerySchema = z.object({
  field: z.enum(["id", "authUserId"]).optional().default("id"),
  filed: z.enum(["id", "authUserId"]).optional(),
});

export type UserCreateInput = z.infer<typeof UserCreateSchema>;
export type UserUpdateInput = z.infer<typeof UserUpdateSchema>;
