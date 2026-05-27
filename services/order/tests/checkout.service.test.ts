import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  order: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/clients/cart.client", () => ({
  getCartItems: vi.fn(),
}));

vi.mock("@/clients/product.client", () => ({
  getProductDetails: vi.fn(),
}));

vi.mock("@/lib/queue", () => ({
  default: vi.fn(),
  ORDER_ROUTING_KEYS: {
    SEND_EMAIL: "email.order_confirmation.requested",
    CLEAR_CART: "cart.clear.requested",
  },
}));

import { getCartItems } from "@/clients/cart.client";
import { getProductDetails } from "@/clients/product.client";
import publishOrderEvent from "@/lib/queue";
import {
  checkoutCart,
  publishCheckoutSideEffects,
} from "@/services/checkout.service";

const user = {
  id: "user-1",
  email: "user@example.com",
  name: "Ada",
  role: "USER",
};

const existingOrder = {
  id: "order-1",
  cartSessionId: "cart-1",
  userId: "user-1",
  userName: "Ada",
  userEmail: "user@example.com",
  subtotal: 100,
  tax: 0,
  grandTotal: 100,
  orderItems: [],
};

describe("checkout service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prismaMock.order.findUnique).mockResolvedValue(null);
    vi.mocked(getCartItems).mockResolvedValue([
      { productId: "product-1", inventoryId: "inventory-1", quantity: 2 },
    ]);
    vi.mocked(getProductDetails).mockResolvedValue({
      id: "product-1",
      name: "Keyboard",
      sku: "KEYBOARD",
      price: 50,
    });
    vi.mocked(prismaMock.order.create).mockResolvedValue(existingOrder);
    vi.mocked(publishOrderEvent).mockResolvedValue(undefined);
  });

  it("publishes checkout side effects with stable event ids", async () => {
    await publishCheckoutSideEffects({
      orderId: "order-1",
      cartSessionId: "cart-1",
      recipient: "user@example.com",
      grandTotal: 100,
    });

    expect(publishOrderEvent).toHaveBeenCalledWith(
      "email.order_confirmation.requested",
      {
        eventId: "order-1:email",
        orderId: "order-1",
        recipient: "user@example.com",
        subject: "Order Confirmation",
        body: "Thank you for your order. Your order id is order-1. Your order total is $100",
        source: "Checkout",
      },
    );
    expect(publishOrderEvent).toHaveBeenCalledWith("cart.clear.requested", {
      eventId: "order-1:clear-cart",
      orderId: "order-1",
      cartSessionId: "cart-1",
      finalized: true,
    });
  });

  it("returns existing orders idempotently and republishes side effects", async () => {
    vi.mocked(prismaMock.order.findUnique).mockResolvedValue(existingOrder);

    await expect(checkoutCart("cart-1", user)).resolves.toEqual({
      status: "exists",
      order: existingOrder,
    });

    expect(getCartItems).not.toHaveBeenCalled();
    expect(publishOrderEvent).toHaveBeenCalledTimes(2);
  });

  it("forbids existing orders owned by another user", async () => {
    vi.mocked(prismaMock.order.findUnique).mockResolvedValue({
      ...existingOrder,
      userId: "other-user",
    });

    await expect(checkoutCart("cart-1", user)).resolves.toEqual({
      status: "forbidden",
    });

    expect(publishOrderEvent).not.toHaveBeenCalled();
  });

  it("returns empty_cart when cart service has no items", async () => {
    vi.mocked(getCartItems).mockResolvedValue([]);

    await expect(checkoutCart("cart-1", user)).resolves.toEqual({
      status: "empty_cart",
    });

    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });

  it("creates orders from cart and product details", async () => {
    vi.mocked(getCartItems).mockResolvedValue([
      { productId: "product-1", inventoryId: "inventory-1", quantity: 2 },
      { productId: "product-2", inventoryId: "inventory-2", quantity: 1 },
    ]);
    vi.mocked(getProductDetails)
      .mockResolvedValueOnce({
        id: "product-1",
        name: "Keyboard",
        sku: "KEYBOARD",
        price: 50,
      })
      .mockResolvedValueOnce({
        id: "product-2",
        name: "Mouse",
        sku: "MOUSE",
        price: 25,
      });
    vi.mocked(prismaMock.order.create).mockResolvedValue({
      ...existingOrder,
      subtotal: 125,
      grandTotal: 125,
    });

    await expect(checkoutCart("cart-1", user)).resolves.toMatchObject({
      status: "created",
      order: {
        id: "order-1",
      },
    });

    expect(prismaMock.order.create).toHaveBeenCalledWith({
      data: {
        cartSessionId: "cart-1",
        userId: "user-1",
        userName: "Ada",
        userEmail: "user@example.com",
        subtotal: 125,
        tax: 0,
        grandTotal: 125,
        orderItems: {
          create: [
            {
              productId: "product-1",
              productName: "Keyboard",
              sku: "KEYBOARD",
              price: 50,
              quantity: 2,
              total: 100,
            },
            {
              productId: "product-2",
              productName: "Mouse",
              sku: "MOUSE",
              price: 25,
              quantity: 1,
              total: 25,
            },
          ],
        },
      },
      include: {
        orderItems: true,
      },
    });
    expect(publishOrderEvent).toHaveBeenCalledTimes(2);
  });

  it("recovers from unique cartSessionId races by returning the existing order", async () => {
    vi.mocked(prismaMock.order.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingOrder);
    vi.mocked(prismaMock.order.create).mockRejectedValue({ code: "P2002" });

    await expect(checkoutCart("cart-1", user)).resolves.toEqual({
      status: "exists",
      order: existingOrder,
    });
  });
});
