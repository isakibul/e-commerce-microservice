import { z } from "zod";

export const UserCreateShchema = z.object({
  authUserId: z.string().min(1),
  name: z.string().trim().min(2).max(50),
  email: z.string().email(),
  address: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(30).optional(),
});

export const UserUpdateShchema = UserCreateShchema.omit({
  authUserId: true,
}).partial();
