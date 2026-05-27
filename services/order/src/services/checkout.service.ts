import { getCartItems } from "@/clients/cart.client";
import { getProductDetails } from "@/clients/product.client";
import { AuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import publishOrderEvent, { ORDER_ROUTING_KEYS } from "@/lib/queue";

type CheckoutSideEffects = {
  orderId: string;
  cartSessionId: string;
  recipient: string;
  grandTotal: unknown;
};

export type CheckoutResult =
  | { status: "created"; order: Awaited<ReturnType<typeof findOrderByCartSession>> }
  | { status: "exists"; order: Awaited<ReturnType<typeof findOrderByCartSession>> }
  | { status: "forbidden" }
  | { status: "empty_cart" };

const findOrderByCartSession = (cartSessionId: string) => {
  return prisma.order.findUnique({
    where: {
      cartSessionId,
    },
    include: {
      orderItems: true,
    },
  });
};

export const publishCheckoutSideEffects = async ({
  orderId,
  cartSessionId,
  recipient,
  grandTotal,
}: CheckoutSideEffects) => {
  await Promise.all([
    publishOrderEvent(ORDER_ROUTING_KEYS.SEND_EMAIL, {
      eventId: `${orderId}:email`,
      orderId,
      recipient,
      subject: "Order Confirmation",
      body: `Thank you for your order. Your order id is ${orderId}. Your order total is $${String(grandTotal)}`,
      source: "Checkout",
    }),
    publishOrderEvent(ORDER_ROUTING_KEYS.CLEAR_CART, {
      eventId: `${orderId}:clear-cart`,
      orderId,
      cartSessionId,
      finalized: true,
    }),
  ]);
};

const returnExistingOrder = async (cartSessionId: string, user: AuthenticatedUser) => {
  const existingOrder = await findOrderByCartSession(cartSessionId);
  if (!existingOrder) {
    return null;
  }

  if (existingOrder.userId !== user.id) {
    return { status: "forbidden" as const };
  }

  await publishCheckoutSideEffects({
    orderId: existingOrder.id,
    cartSessionId,
    recipient: existingOrder.userEmail,
    grandTotal: existingOrder.grandTotal,
  });

  return {
    status: "exists" as const,
    order: existingOrder,
  };
};

export const checkoutCart = async (
  cartSessionId: string,
  user: AuthenticatedUser,
): Promise<CheckoutResult> => {
  const existingOrder = await returnExistingOrder(cartSessionId, user);
  if (existingOrder) {
    return existingOrder;
  }

  const cartItems = await getCartItems(cartSessionId);
  if (cartItems.length === 0) {
    return { status: "empty_cart" };
  }

  const productDetails = await Promise.all(
    cartItems.map(async (item) => {
      const product = await getProductDetails(item.productId);

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        price: product.price,
        quantity: item.quantity,
        total: product.price * item.quantity,
      };
    }),
  );

  const subtotal = productDetails.reduce((acc, item) => acc + item.total, 0);
  const tax = 0;
  const grandTotal = subtotal + tax;

  try {
    const order = await prisma.order.create({
      data: {
        cartSessionId,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        subtotal,
        tax,
        grandTotal,
        orderItems: {
          create: productDetails.map((item) => ({
            ...item,
          })),
        },
      },
      include: {
        orderItems: true,
      },
    });

    await publishCheckoutSideEffects({
      orderId: order.id,
      cartSessionId,
      recipient: user.email,
      grandTotal,
    });

    return {
      status: "created",
      order,
    };
  } catch (error) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2002") {
        const existingAfterRace = await returnExistingOrder(cartSessionId, user);
        if (existingAfterRace) {
          return existingAfterRace;
        }
      }
    }

    throw error;
  }
};
