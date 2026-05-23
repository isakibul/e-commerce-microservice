import { CART_SERVICE, EMAIL_SERVICE, PRODUCT_SERVICE } from "@/config";
import { prisma } from "@/prisma";
// import sendToQueue from "@/queue";
import { CartItemSchema, OrderSchema } from "@/schemas";
import axios from "axios";
import { NextFunction, Request, Response } from "express";
import { z } from "zod";

const checkout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    /**
     * Validate request body
     */
    const parsedBody = OrderSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ errors: parsedBody.error.message });
    }

    /**
     * Get cart details
     */
    const { data: cartData } = await axios.get(`${CART_SERVICE}/cart/me`, {
      headers: {
        "x-cart-session-id": parsedBody.data.cartSessionId,
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
        const { data: product } = await axios.get(
          `${PRODUCT_SERVICE}/products/${item.productId}`,
        );
        return {
          productId: product.id as string,
          productName: product.name as string,
          sku: product.sku as string,
          price: product.price as number,
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
    const order = await prisma.order.create({
      data: {
        userId: parsedBody.data.userId,
        userName: parsedBody.data.userName,
        userEmail: parsedBody.data.userEmail,
        subtotal,
        tax,
        grandTotal,
        orderItems: {
          create: productDetails.map((item) => ({
            ...item,
          })),
        },
      },
    });

    console.log("Order created: ", order.id);

    /**
     * Clear cart
     */
    await axios.get(`${CART_SERVICE}/cart/clear`, {
      headers: {
        "x-cart-session-id": parsedBody.data.cartSessionId,
      },
    });

    /**
     * Send order confirmation email
     */
    await axios.post(`${EMAIL_SERVICE}/emails/send`, {
      recipient: parsedBody.data.userEmail,
      subject: "Order Confirmation",
      body: `Thank you for your order. Your order id is ${order.id}. Your order total is $${grandTotal}`,
      source: "Checkout",
    });

    // /**
    //  * Send to queue
    //  */
    // sendToQueue("send-email", JSON.stringify(order));
    // sendToQueue(
    //   "clear-cart",
    //   JSON.stringify({ cartSessionId: parsedBody.data.cartSessionId }),
    // );

    return res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

export default checkout;
