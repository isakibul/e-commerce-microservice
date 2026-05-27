import { describe, expect, it } from "vitest";
import {
  compareVerificationCode,
  generateVerificationCode,
  hashVerificationCode,
} from "@/services/verification.service";

describe("verification service", () => {
  it("generates six-digit numeric codes", () => {
    const code = generateVerificationCode();

    expect(code).toMatch(/^\d{6}$/);
  });

  it("hashes and compares verification codes", async () => {
    const hash = await hashVerificationCode("123456");

    expect(hash).not.toBe("123456");
    await expect(compareVerificationCode("123456", hash)).resolves.toBe(true);
    await expect(compareVerificationCode("000000", hash)).resolves.toBe(false);
  });
});
