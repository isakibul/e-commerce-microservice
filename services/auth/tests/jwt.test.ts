import jwt from "jsonwebtoken";
import { afterEach, describe, expect, it } from "vitest";
import { getJwtSecret, signAccessToken } from "@/lib/jwt";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

afterEach(() => {
  process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
});

describe("jwt helpers", () => {
  it("rejects missing or default JWT secrets", () => {
    delete process.env.JWT_SECRET;
    expect(() => getJwtSecret()).toThrow("JWT_SECRET is not configured");

    process.env.JWT_SECRET = "super_secret_key";
    expect(() => getJwtSecret()).toThrow("JWT_SECRET is not configured");
  });

  it("signs access tokens with expected claims", () => {
    process.env.JWT_SECRET = "test-secret";

    const token = signAccessToken({
      id: "user-1",
      email: "user@example.com",
      name: "Ada",
      role: "USER",
    });

    const decoded = jwt.verify(token, "test-secret", {
      algorithms: ["HS256"],
    }) as jwt.JwtPayload;

    expect(decoded.userId).toBe("user-1");
    expect(decoded.email).toBe("user@example.com");
    expect(decoded.name).toBe("Ada");
    expect(decoded.role).toBe("USER");
    expect(decoded.exp).toBeTypeOf("number");
  });
});
