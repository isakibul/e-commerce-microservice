-- Add idempotency key for cart checkout.
ALTER TABLE "Order" ADD COLUMN "cartSessionId" TEXT;

-- Store monetary values as fixed precision decimals.
ALTER TABLE "Order"
  ALTER COLUMN "subtotal" TYPE DECIMAL(12, 2) USING "subtotal"::DECIMAL(12, 2),
  ALTER COLUMN "tax" TYPE DECIMAL(12, 2) USING "tax"::DECIMAL(12, 2),
  ALTER COLUMN "grandTotal" TYPE DECIMAL(12, 2) USING "grandTotal"::DECIMAL(12, 2);

ALTER TABLE "OrderItem"
  ALTER COLUMN "price" TYPE DECIMAL(12, 2) USING "price"::DECIMAL(12, 2),
  ALTER COLUMN "total" TYPE DECIMAL(12, 2) USING "total"::DECIMAL(12, 2);

CREATE UNIQUE INDEX "Order_cartSessionId_key" ON "Order"("cartSessionId");
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
