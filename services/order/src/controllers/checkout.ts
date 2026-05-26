import { getAuthenticatedUser } from "@/auth";
import {
  CART_SERVICE,
  INTERNAL_GATEWAY_SECRET,
  PRODUCT_SERVICE,
} from "@/config";
import { prisma } from "@/prisma";
import publishOrderEvent, { ORDER_ROUTING_KEYS } from "@/queue";
import { CartItemSchema, OrderSchema, ProductDetailsSchema } from "@/schemas";
import axios from "axios";
import { NextFunction, Request, Response } from "express";
import { z } from "zod";

type CheckoutSideEffects = {
  orderId: string;
  cartSessionId: string;
  recipient: string;
  grandTotal: unknown;
};

const publishCheckoutSideEffects = async ({
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

const checkout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    /**
     * Validate request body
     */
    const parsedBody = OrderSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ errors: parsedBody.error.message });
    }

    const existingOrder = await prisma.order.findUnique({
      where: {
        cartSessionId: parsedBody.data.cartSessionId,
      },
      include: {
        orderItems: true,
      },
    });

    if (existingOrder) {
      if (existingOrder.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await publishCheckoutSideEffects({
        orderId: existingOrder.id,
        cartSessionId: parsedBody.data.cartSessionId,
        recipient: existingOrder.userEmail,
        grandTotal: existingOrder.grandTotal,
      });
      return res.status(200).json(existingOrder);
    }

    /**
     * Get cart details
     */
    const { data: cartData } = await axios.get(`${CART_SERVICE}/cart/me`, {
      headers: {
        "x-cart-session-id": parsedBody.data.cartSessionId,
        "x-internal-gateway-secret": INTERNAL_GATEWAY_SECRET,
      },
    });
    const cartItems = z.array(CartItemSchema).safeParse(cartData.data);
    if (!cartItems.success) {
      return res.status(400).json({ errors: cartItems.error.message });
    }

    if (cartItems.data.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    /**
     * Get product details from cart items
     */
    const productDetails = await Promise.all(
      cartItems.data.map(async (item) => {
        const { data } = await axios.get(
          `${PRODUCT_SERVICE}/products/${item.productId}`,
          {
            headers: {
              "x-internal-gateway-secret": INTERNAL_GATEWAY_SECRET,
            },
          },
        );
        const product = ProductDetailsSchema.parse(data);

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

    // TODO: will handle tax calculation later
    const tax = 0;
    const grandTotal = subtotal + tax;

    /**
     * Create order in database
     */
    let order;
    try {
      order = await prisma.order.create({
        data: {
          cartSessionId: parsedBody.data.cartSessionId,
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
    } catch (error) {
      if (typeof error === "object" && error && "code" in error) {
        const code = (error as { code?: string }).code;
        if (code === "P2002") {
          const existingOrder = await prisma.order.findUnique({
            where: {
              cartSessionId: parsedBody.data.cartSessionId,
            },
            include: {
              orderItems: true,
            },
          });

          if (existingOrder) {
            if (existingOrder.userId !== user.id) {
              return res.status(403).json({ message: "Forbidden" });
            }

            await publishCheckoutSideEffects({
              orderId: existingOrder.id,
              cartSessionId: parsedBody.data.cartSessionId,
              recipient: existingOrder.userEmail,
              grandTotal: existingOrder.grandTotal,
            });
            return res.status(200).json(existingOrder);
          }
        }
      }

      throw error;
    }

    console.log("Order created: ", order.id);

    /**
     * Publish post-checkout side effects.
     */
    await publishCheckoutSideEffects({
      orderId: order.id,
      cartSessionId: parsedBody.data.cartSessionId,
      recipient: user.email,
      grandTotal,
    });

    return res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

export default checkout;
