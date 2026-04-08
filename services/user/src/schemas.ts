import { z } from "zod";

export const UserCreateShchema = z.object({
  authUserId: z.string(),
  name: z.string(),
  email: z.string().email(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export const UserUpdateShchema = UserCreateShchema.omit({
  authUserId: true,
}).partial();
