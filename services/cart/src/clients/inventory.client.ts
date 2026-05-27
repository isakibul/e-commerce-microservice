import { INTERNAL_GATEWAY_SECRET, INVENTORY_SERVICE_URL } from "@/config";
import axios from "axios";

export type InventoryAction = "In" | "Out";

export const updateInventory = async (
  inventoryId: string,
  quantity: number,
  actionType: InventoryAction,
) => {
  await axios.put(
    `${INVENTORY_SERVICE_URL}/inventories/${inventoryId}`,
    {
      quantity,
      actionType,
    },
    {
      headers: {
        "x-internal-gateway-secret": INTERNAL_GATEWAY_SECRET,
      },
    },
  );
};

export const isInventoryClientError = axios.isAxiosError;
