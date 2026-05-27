import { describe, expect, it } from "vitest";
import {
  AuthEmailEventSchema,
  EmailCreateSchema,
  EmailQuerySchema,
  OrderConfirmationEventSchema,
} from "@/schemas";

describe("email schemas", () => {
  it("validates email creation payloads", () => {
    expect(
      EmailCreateSchema.safeParse({
        recipient: "user@example.com",
        subject: "Welcome",
        body: "Hello",
        source: "test",
      }).success,
    ).toBe(true);

    expect(
      EmailCreateSchema.safeParse({
        recipient: "bad-email",
        subject: "",
        body: "",
        source: "",
      }).success,
    ).toBe(false);
  });

  it("coerces and validates query pagination", () => {
    const parsed = EmailQuerySchema.parse({
      page: "2",
      limit: "10",
      recipient: "user@example.com",
    });

    expect(parsed).toEqual({
      page: 2,
      limit: 10,
      recipient: "user@example.com",
    });

    expect(EmailQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
  });

  it("validates order confirmation events", () => {
    expect(
      OrderConfirmationEventSchema.safeParse({
        eventId: "event-1",
        orderId: "order-1",
        recipient: "user@example.com",
        subject: "Order Confirmation",
        body: "Thanks",
        source: "Checkout",
      }).success,
    ).toBe(true);

    expect(
      OrderConfirmationEventSchema.safeParse({
        eventId: "event-1",
        recipient: "user@example.com",
        subject: "Order Confirmation",
        body: "Thanks",
        source: "Checkout",
      }).success,
    ).toBe(false);
  });

  it("validates auth email events", () => {
    expect(
      AuthEmailEventSchema.safeParse({
        eventId: "event-1",
        userId: "user-1",
        recipient: "user@example.com",
        subject: "Verify your email",
        body: "123456",
        source: "user_registration",
      }).success,
    ).toBe(true);

    expect(
      AuthEmailEventSchema.safeParse({
        eventId: "event-1",
        recipient: "user@example.com",
        subject: "Verify your email",
        body: "123456",
        source: "user_registration",
      }).success,
    ).toBe(false);
  });
});
