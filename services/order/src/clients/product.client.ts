import { INTERNAL_GATEWAY_SECRET, PRODUCT_SERVICE } from "@/config";
import { ProductDetailsSchema } from "@/schemas";
import axios from "axios";

export const getProductDetails = async (productId: string) => {
  const { data } = await axios.get(`${PRODUCT_SERVICE}/products/${productId}`, {
    headers: {
      "x-internal-gateway-secret": INTERNAL_GATEWAY_SECRET,
    },
  });

  return ProductDetailsSchema.parse(data);
};
