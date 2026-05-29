import { describe, expect, it, vi } from "vitest";
import {
  createErrorHandler,
  createRequestContext,
  notFoundHandler,
} from "@ecommerce/shared";

const createResponse = () => ({
  statusCode: 200,
  setHeader: vi.fn(),
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
});

describe("shared HTTP middleware", () => {
  it("propagates incoming request ids", () => {
    const middleware = createRequestContext();
    const req = {
      headers: {
        "x-request-id": "request-1",
      },
    } as any;
    const res = createResponse();
    const next = vi.fn();

    middleware(req, res as any, next);

    expect(req.requestId).toBe("request-1");
    expect(res.setHeader).toHaveBeenCalledWith("x-request-id", "request-1");
    expect(next).toHaveBeenCalledOnce();
  });

  it("returns request ids in not found responses", () => {
    const res = createResponse();

    notFoundHandler({ requestId: "request-2" } as any, res as any, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "NOT_FOUND",
        message: "Not Found",
        requestId: "request-2",
      },
    });
  });

  it("hides unexpected error details from clients", () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const handler = createErrorHandler({ logger });
    const res = createResponse();

    handler(
      new Error("database exploded"),
      {
        method: "GET",
        originalUrl: "/auth/login",
        requestId: "request-3",
      } as any,
      res as any,
      vi.fn(),
    );

    expect(logger.error).toHaveBeenCalledOnce();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal Server Error",
        details: undefined,
        requestId: "request-3",
      },
    });
  });
});
