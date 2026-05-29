import { afterEach, describe, expect, it } from "vitest";
import { assertProductionSecrets, assertRequiredEnv } from "@ecommerce/shared";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("shared env guards", () => {
  it("requires configured variables", () => {
    delete process.env.REQUIRED_FOR_TEST;

    expect(() =>
      assertRequiredEnv("Test-Service", ["REQUIRED_FOR_TEST"]),
    ).toThrow("Test-Service is missing required environment variables");
  });

  it("rejects local secrets in production", () => {
    process.env.NODE_ENV = "production";
    process.env.INTERNAL_GATEWAY_SECRET = "local_dev_internal_gateway_secret";

    expect(() =>
      assertProductionSecrets("Test-Service", ["INTERNAL_GATEWAY_SECRET"]),
    ).toThrow("Test-Service has unsafe production secrets");
  });
});
