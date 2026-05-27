import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
  isAdmin: vi.fn(),
}));

vi.mock("@/services/email.service", () => ({
  sendEmailMessage: vi.fn(),
  listEmails: vi.fn(),
}));

import getEmails from "@/controllers/getEmails";
import sendEmail from "@/controllers/sendEmail";
import { getAuthenticatedUser, isAdmin } from "@/lib/auth";
import { listEmails, sendEmailMessage } from "@/services/email.service";

const createResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
});

const adminUser = {
  id: "user-1",
  email: "admin@example.com",
  name: "Admin",
  role: "ADMIN",
};

describe("email controllers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends email and allows sender override for admins", async () => {
    vi.mocked(getAuthenticatedUser).mockReturnValue(adminUser);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(sendEmailMessage).mockResolvedValue({ messageId: "message-1" });
    const res = createResponse();

    await sendEmail(
      {
        body: {
          recipient: "user@example.com",
          subject: "Hello",
          body: "Welcome",
          source: "manual",
          sender: "admin@example.com",
        },
      } as any,
      res as any,
      vi.fn(),
    );

    expect(sendEmailMessage).toHaveBeenCalledWith({
      recipient: "user@example.com",
      subject: "Hello",
      body: "Welcome",
      source: "manual",
      sender: "admin@example.com",
      senderOverrideAllowed: true,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Email sent successfully",
      messageId: "message-1",
    });
  });

  it("rejects invalid send payloads", async () => {
    const res = createResponse();

    await sendEmail(
      { body: { recipient: "bad-email" } } as any,
      res as any,
      vi.fn(),
    );

    expect(sendEmailMessage).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("requires an authenticated admin to list emails", async () => {
    vi.mocked(getAuthenticatedUser).mockReturnValue(null);
    const unauthorizedRes = createResponse();

    await getEmails({ query: {} } as any, unauthorizedRes as any, vi.fn());

    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);
    expect(unauthorizedRes.json).toHaveBeenCalledWith({
      message: "Unauthorized",
    });

    vi.mocked(getAuthenticatedUser).mockReturnValue({
      ...adminUser,
      role: "USER",
    });
    vi.mocked(isAdmin).mockReturnValue(false);
    const forbiddenRes = createResponse();

    await getEmails({ query: {} } as any, forbiddenRes as any, vi.fn());

    expect(forbiddenRes.status).toHaveBeenCalledWith(403);
    expect(forbiddenRes.json).toHaveBeenCalledWith({ message: "Forbidden" });
  });

  it("lists emails for admins", async () => {
    vi.mocked(getAuthenticatedUser).mockReturnValue(adminUser);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(listEmails).mockResolvedValue({
      emails: [{ id: "email-1" }],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    } as any);
    const res = createResponse();

    await getEmails(
      {
        query: {
          page: "1",
          limit: "20",
          recipient: "user@example.com",
        },
      } as any,
      res as any,
      vi.fn(),
    );

    expect(listEmails).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      recipient: "user@example.com",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: [{ id: "email-1" }],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
  });
});
