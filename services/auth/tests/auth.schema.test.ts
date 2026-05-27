import { describe, expect, it } from "vitest";
import {
  AccessTokenSchema,
  EmailVerificationSchema,
  RefreshTokenSchema,
  ResendVerificationSchema,
  UserCreateSchema,
  UserLoginSchema,
} from "@/schemas/auth.schema";

describe("auth schemas", () => {
  it("validates registration payloads", () => {
    expect(
      UserCreateSchema.safeParse({
        email: "user@example.com",
        password: "strong-password",
        name: "Ada Lovelace",
      }).success,
    ).toBe(true);

    expect(
      UserCreateSchema.safeParse({
        email: "bad-email",
        password: "short",
        name: "A",
      }).success,
    ).toBe(false);
  });

  it("validates login payloads without requiring long passwords", () => {
    expect(
      UserLoginSchema.safeParse({
        email: "user@example.com",
        password: "x",
      }).success,
    ).toBe(true);

    expect(
      UserLoginSchema.safeParse({
        email: "user@example.com",
        password: "",
      }).success,
    ).toBe(false);
  });

  it("validates verification and resend payloads", () => {
    expect(
      EmailVerificationSchema.safeParse({
        email: "user@example.com",
        code: "123456",
      }).success,
    ).toBe(true);
    expect(
      EmailVerificationSchema.safeParse({
        email: "user@example.com",
        code: "12345",
      }).success,
    ).toBe(false);
    expect(
      ResendVerificationSchema.safeParse({
        email: "user@example.com",
      }).success,
    ).toBe(true);
  });

  it("validates access and refresh token payloads", () => {
    expect(AccessTokenSchema.safeParse({ accessToken: "token" }).success).toBe(
      true,
    );
    expect(
      RefreshTokenSchema.safeParse({ refreshToken: "a".repeat(64) }).success,
    ).toBe(true);
    expect(
      RefreshTokenSchema.safeParse({ refreshToken: "too-short" }).success,
    ).toBe(false);
  });
});
