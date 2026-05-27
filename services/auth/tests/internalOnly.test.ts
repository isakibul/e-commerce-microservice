import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_SECRET = process.env.INTERNAL_GATEWAY_SECRET;

afterEach(() => {
  process.env.INTERNAL_GATEWAY_SECRET = ORIGINAL_SECRET;
  vi.resetModules();
});

const loadMiddleware = async () => {
  return import("@/middlewares/internalOnly");
};

describe("internalOnly middleware", () => {
  it("allows health checks without an internal secret", async () => {
    const { internalOnly } = await loadMiddleware();
    const next = vi.fn();
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    internalOnly({ path: "/health", headers: {} } as any, res as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects requests with a missing or invalid internal secret", async () => {
    process.env.INTERNAL_GATEWAY_SECRET = "expected-secret";
    const { internalOnly } = await loadMiddleware();
    const next = vi.fn();
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    internalOnly({ path: "/auth/login", headers: {} } as any, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
  });

  it("allows requests with the configured internal secret", async () => {
    process.env.INTERNAL_GATEWAY_SECRET = "expected-secret";
    const { internalOnly } = await loadMiddleware();
    const next = vi.fn();
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    internalOnly(
      {
        path: "/auth/login",
        headers: { "x-internal-gateway-secret": "expected-secret" },
      } as any,
      res as any,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
