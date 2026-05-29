import { describe, expect, it } from "vitest";
import {
  UserCreateSchema,
  UserLookupQuerySchema,
  UserProfileCreateSchema,
  UserUpdateSchema,
} from "@/schemas";

describe("user schemas", () => {
  it("validates create payloads", () => {
    expect(
      UserCreateSchema.safeParse({
        authUserId: "auth-1",
        email: "user@example.com",
        name: "Ada",
        address: "Dhaka",
        phone: "+8801000000000",
      }).success,
    ).toBe(true);

    expect(
      UserCreateSchema.safeParse({
        authUserId: "",
        email: "bad-email",
        name: "A",
      }).success,
    ).toBe(false);
  });

  it("validates partial update payloads without authUserId", () => {
    expect(
      UserUpdateSchema.safeParse({
        name: "Grace Hopper",
        address: "New York",
      }).success,
    ).toBe(true);

    expect(
      UserUpdateSchema.safeParse({
        name: "A",
      }).success,
    ).toBe(false);
  });

  it("validates authenticated profile creation payloads", () => {
    expect(
      UserProfileCreateSchema.safeParse({
        name: "Ada Lovelace",
        address: "London",
      }).success,
    ).toBe(true);

    expect(
      UserProfileCreateSchema.safeParse({
        authUserId: "client-controlled-id",
      }).success,
    ).toBe(false);
  });

  it("supports field and legacy filed lookup query", () => {
    expect(UserLookupQuerySchema.parse({})).toEqual({ field: "id" });
    expect(UserLookupQuerySchema.parse({ field: "authUserId" })).toEqual({
      field: "authUserId",
    });
    expect(UserLookupQuerySchema.parse({ filed: "authUserId" })).toEqual({
      field: "id",
      filed: "authUserId",
    });
    expect(UserLookupQuerySchema.safeParse({ field: "email" }).success).toBe(
      false,
    );
  });
});
