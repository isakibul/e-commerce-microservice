import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  email: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
}));

const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

const transporterMock = vi.hoisted(() => ({
  sendMail: vi.fn(),
}));

vi.mock("@/config", () => ({
  DEFAULT_EMAIL_SENDER: "admin@example.com",
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/redis", () => ({
  default: redisMock,
  redis: redisMock,
}));

vi.mock("@/lib/mailer", () => ({
  transporter: transporterMock,
}));

import redis from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { transporter } from "@/lib/mailer";
import {
  listEmails,
  sendEmailFromEvent,
  sendEmailMessage,
} from "@/services/email.service";

const emailInput = {
  recipient: "user@example.com",
  subject: "Hello",
  body: "Welcome",
  source: "test",
};

describe("email service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(transporter.sendMail).mockResolvedValue({
      messageId: "message-1",
      response: "250 OK",
      accepted: ["user@example.com"],
      rejected: [],
    } as any);
    vi.mocked(prisma.email.create).mockResolvedValue({ id: "email-1" } as any);
    vi.mocked(redis.get).mockResolvedValue(null);
    vi.mocked(redis.set).mockResolvedValue("OK");
    vi.mocked(redis.del).mockResolvedValue(1);
  });

  it("sends email from the default sender and persists delivery metadata", async () => {
    await expect(sendEmailMessage(emailInput)).resolves.toEqual({
      messageId: "message-1",
    });

    expect(transporter.sendMail).toHaveBeenCalledWith({
      from: "admin@example.com",
      to: "user@example.com",
      subject: "Hello",
      text: "Welcome",
    });
    expect(prisma.email.create).toHaveBeenCalledWith({
      data: {
        sender: "admin@example.com",
        recipient: "user@example.com",
        subject: "Hello",
        body: "Welcome",
        source: "test",
        messageId: "message-1",
        response: "250 OK",
        acceptedCount: 1,
      },
    });
  });

  it("allows sender override only when explicitly permitted", async () => {
    await sendEmailMessage({
      ...emailInput,
      sender: "owner@example.com",
      senderOverrideAllowed: true,
    });

    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: "owner@example.com" }),
    );

    vi.clearAllMocks();
    vi.mocked(transporter.sendMail).mockResolvedValue({
      messageId: "message-2",
      response: "250 OK",
      accepted: ["user@example.com"],
      rejected: [],
    } as any);

    await sendEmailMessage({
      ...emailInput,
      sender: "owner@example.com",
      senderOverrideAllowed: false,
    });

    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: "admin@example.com" }),
    );
  });

  it("throws when SMTP rejects recipients and does not persist", async () => {
    vi.mocked(transporter.sendMail).mockResolvedValue({
      messageId: "message-1",
      response: "rejected",
      accepted: [],
      rejected: ["user@example.com"],
    } as any);

    await expect(sendEmailMessage(emailInput)).rejects.toThrow(
      "Email rejected: user@example.com",
    );

    expect(prisma.email.create).not.toHaveBeenCalled();
  });

  it("skips already processed email events", async () => {
    vi.mocked(redis.get).mockResolvedValue("1");

    await sendEmailFromEvent({
      eventId: "event-1",
      ...emailInput,
    });

    expect(redis.set).not.toHaveBeenCalled();
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });

  it("skips email events that are already locked", async () => {
    vi.mocked(redis.set).mockResolvedValueOnce(null);

    await sendEmailFromEvent({
      eventId: "event-1",
      ...emailInput,
    });

    expect(redis.set).toHaveBeenCalledWith("email-event:lock:event-1", "1", "EX", 300, "NX");
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });

  it("locks, sends, and marks email events as processed", async () => {
    await sendEmailFromEvent({
      eventId: "event-1",
      ...emailInput,
    });

    expect(redis.set).toHaveBeenNthCalledWith(
      1,
      "email-event:lock:event-1",
      "1",
      "EX",
      300,
      "NX",
    );
    expect(transporter.sendMail).toHaveBeenCalledOnce();
    expect(redis.set).toHaveBeenNthCalledWith(
      2,
      "email-event:sent:event-1",
      "1",
      "EX",
      60 * 60 * 24 * 30,
    );
  });

  it("releases event locks when sending fails", async () => {
    vi.mocked(transporter.sendMail).mockRejectedValue(new Error("smtp down"));

    await expect(
      sendEmailFromEvent({
        eventId: "event-1",
        ...emailInput,
      }),
    ).rejects.toThrow("smtp down");

    expect(redis.del).toHaveBeenCalledWith("email-event:lock:event-1");
  });

  it("lists emails with filters and pagination metadata", async () => {
    vi.mocked(prisma.email.findMany).mockResolvedValue([
      { id: "email-1" },
    ] as any);
    vi.mocked(prisma.email.count).mockResolvedValue(21);

    await expect(
      listEmails({
        page: 2,
        limit: 10,
        recipient: "user@example.com",
        source: "test",
      }),
    ).resolves.toEqual({
      emails: [{ id: "email-1" }],
      meta: {
        page: 2,
        limit: 10,
        total: 21,
        totalPages: 3,
      },
    });

    expect(prisma.email.findMany).toHaveBeenCalledWith({
      where: {
        recipient: "user@example.com",
        source: "test",
      },
      orderBy: {
        sentAt: "desc",
      },
      skip: 10,
      take: 10,
    });
  });
});
