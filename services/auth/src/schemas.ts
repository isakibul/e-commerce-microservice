import { z } from "zod";

export const UserCreateShchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(50),
});

export const UserLoginSchema = z.object({
  email: z.string().email(),
  password: z.string,
});

export const AccessTokenSchema = z.object({
  accessToken: z.string(),
});

export const EmailVerificationSchema = z.object({
  email: z.string().email(),
  code: z.string(),
});
