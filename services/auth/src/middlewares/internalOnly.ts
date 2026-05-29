import { createInternalOnlyMiddleware } from "@ecommerce/shared";
import { INTERNAL_GATEWAY_SECRET } from "@/config";

export const internalOnly = createInternalOnlyMiddleware({
  secret: INTERNAL_GATEWAY_SECRET,
});
