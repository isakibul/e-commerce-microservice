import { INTERNAL_GATEWAY_SECRET, INVENTORY_URL } from "@/config";
import {
  InventoryCreateResponseSchema,
  InventoryDetailsSchema,
} from "@/schemas";
import axios from "axios";

export const createInventoryForProduct = async ({
  productId,
  sku,
}: {
  productId: string;
  sku: string;
}) => {
  const { data } = await axios.post(
    `${INVENTORY_URL}/inventories`,
    {
      productId,
      sku,
    },
    {
      headers: {
        "x-internal-gateway-secret": INTERNAL_GATEWAY_SECRET,
        "x-internal-service": "product",
      },
    },
  );

  return InventoryCreateResponseSchema.parse(data);
};

export const getInventoryQuantity = async (inventoryId: string) => {
  const { data } = await axios.get(`${INVENTORY_URL}/inventories/${inventoryId}`, {
    headers: {
      "x-internal-gateway-secret": INTERNAL_GATEWAY_SECRET,
    },
  });

  return InventoryDetailsSchema.parse(data);
};
