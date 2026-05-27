import { updateInventory } from "@/clients/inventory.client";
import { CART_TTL } from "@/config";
import redis from "@/lib/redis";
import { v4 as uuid } from "uuid";

export type CartItemInput = {
  productId: string;
  inventoryId: string;
  quantity: number;
};

export type CartItem = CartItemInput;

type StoredCartItem = {
  inventoryId: string;
  quantity: number;
};

type ClearCartOptions = {
  releaseInventory?: boolean;
};

const sessionKey = (id: string) => `sessions:${id}`;
const cartKey = (id: string) => `cart:${id}`;

const parseCartItem = (value: string): StoredCartItem => {
  return JSON.parse(value) as StoredCartItem;
};

export const ensureCartSession = async (requestedSessionId?: string | null) => {
  if (requestedSessionId) {
    const exists = await redis.exists(sessionKey(requestedSessionId));
    if (exists) {
      return { cartSessionId: requestedSessionId, created: false };
    }
  }

  const cartSessionId = uuid();
  await redis.setex(sessionKey(cartSessionId), CART_TTL, cartSessionId);

  return { cartSessionId, created: true };
};

export const addCartItem = async (
  cartSessionId: string,
  item: CartItemInput,
) => {
  const existingItem = await redis.hget(cartKey(cartSessionId), item.productId);
  const parsedExistingItem = existingItem ? parseCartItem(existingItem) : null;
  const existingQuantity = parsedExistingItem?.quantity || 0;

  if (parsedExistingItem && parsedExistingItem.inventoryId !== item.inventoryId) {
    return {
      status: "conflict" as const,
      message: "Product already exists in cart with another inventory item",
    };
  }

  const quantityDelta = item.quantity - existingQuantity;

  if (quantityDelta > 0) {
    await updateInventory(item.inventoryId, quantityDelta, "Out");
  }

  try {
    if (item.quantity === 0) {
      await redis.hdel(cartKey(cartSessionId), item.productId);
    } else {
      await redis.hset(
        cartKey(cartSessionId),
        item.productId,
        JSON.stringify({
          inventoryId: item.inventoryId,
          quantity: item.quantity,
        }),
      );
    }

    await redis.expire(sessionKey(cartSessionId), CART_TTL);
    await redis.persist(cartKey(cartSessionId));
  } catch (error) {
    if (quantityDelta > 0) {
      await updateInventory(item.inventoryId, quantityDelta, "In");
    }

    throw error;
  }

  if (quantityDelta < 0) {
    try {
      await updateInventory(item.inventoryId, Math.abs(quantityDelta), "In");
    } catch (error) {
      if (parsedExistingItem) {
        await redis.hset(
          cartKey(cartSessionId),
          item.productId,
          JSON.stringify(parsedExistingItem),
        );
      }

      throw error;
    }
  }

  return {
    status: "updated" as const,
    message: item.quantity === 0 ? "Item removed from cart" : "Item added to cart",
  };
};

export const getCartItems = async (cartSessionId?: string | null) => {
  if (!cartSessionId) {
    return [];
  }

  const session = await redis.exists(sessionKey(cartSessionId));
  if (!session) {
    await clearCart(cartSessionId);
    return [];
  }

  const items = await redis.hgetall(cartKey(cartSessionId));

  return Object.entries(items).map(([productId, value]) => {
    const { quantity, inventoryId } = parseCartItem(value);

    return {
      productId,
      quantity,
      inventoryId,
    };
  });
};

export const clearCart = async (
  id: string,
  options: ClearCartOptions = {},
) => {
  const releaseInventory = options.releaseInventory ?? true;
  const data = await redis.hgetall(cartKey(id));
  if (Object.keys(data).length === 0) {
    await redis.del(sessionKey(id));
    return false;
  }

  if (releaseInventory) {
    const inventoryQuantities = new Map<string, number>();

    Object.values(data).forEach((item) => {
      const { quantity, inventoryId } = parseCartItem(item);

      if (quantity <= 0) {
        return;
      }

      inventoryQuantities.set(
        inventoryId,
        (inventoryQuantities.get(inventoryId) || 0) + quantity,
      );
    });

    await Promise.all(
      Array.from(inventoryQuantities).map(([inventoryId, quantity]) =>
        updateInventory(inventoryId, quantity, "In"),
      ),
    );
  }

  await redis.del(cartKey(id));
  await redis.del(sessionKey(id));

  return true;
};
