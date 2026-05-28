import { createInternalOnlyMiddleware } from "@ecommerce/shared";

export const INTERNAL_GATEWAY_SECRET =
  process.env.INTERNAL_GATEWAY_SECRET || "local_internal_gateway_secret";

export const internalOnly = createInternalOnlyMiddleware({
  secret: INTERNAL_GATEWAY_SECRET,
});
