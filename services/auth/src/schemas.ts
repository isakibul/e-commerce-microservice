import { z } from "zod";

export const UserCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(2).max(50),
});

export const UserLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const AccessTokenSchema = z.object({
  accessToken: z.string(),
});

export const EmailVerificationSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export const ResendVerificationSchema = z.object({
  email: z.string().email(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(64),
});
