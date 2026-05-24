ALTER TABLE "Email"
  ADD COLUMN "messageId" TEXT,
  ADD COLUMN "response" TEXT,
  ADD COLUMN "acceptedCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Email_recipient_idx" ON "Email"("recipient");
CREATE INDEX "Email_source_idx" ON "Email"("source");
CREATE INDEX "Email_sentAt_idx" ON "Email"("sentAt");
