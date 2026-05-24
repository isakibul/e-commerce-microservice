import { INTERNAL_GATEWAY_SECRET, INVENTORY_SERVICE_URL } from "@/config";
import redis from "@/redis";
import axios from "axios";

type ClearCartOptions = {
  releaseInventory?: boolean;
};

export const clearCart = async (
  id: string,
  options: ClearCartOptions = {},
) => {
  const releaseInventory = options.releaseInventory ?? true;
  const data = await redis.hgetall(`cart:${id}`);
  if (Object.keys(data).length === 0) {
    await redis.del(`sessions:${id}`);
    return false;
  }

  if (releaseInventory) {
    const inventoryQuantities = new Map<string, number>();

    Object.values(data).forEach((item) => {
      const { quantity, inventoryId } = JSON.parse(item) as {
        inventoryId: string;
        quantity: number;
      };

      if (quantity <= 0) {
        return;
      }

      inventoryQuantities.set(
        inventoryId,
        (inventoryQuantities.get(inventoryId) || 0) + quantity,
      );
    });

    /**
     * Update inventory
     */
    const requests = Array.from(inventoryQuantities).map(
      ([inventoryId, quantity]) => {
        return axios.put(
          `${INVENTORY_SERVICE_URL}/inventories/${inventoryId}`,
          {
            quantity,
            actionType: "In",
          },
          {
            headers: {
              "x-internal-gateway-secret": INTERNAL_GATEWAY_SECRET,
            },
          },
        );
      },
    );

    await Promise.all(requests);
  }

  /**
   * Clear the cart and session
   */
  await redis.del(`cart:${id}`);
  await redis.del(`sessions:${id}`);

  return true;
};
