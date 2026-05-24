CREATE INDEX "LoginHistory_userId_idx" ON "LoginHistory"("userId");
CREATE INDEX "LoginHistory_loginAt_idx" ON "LoginHistory"("loginAt");
CREATE INDEX "VerificationCode_userId_status_type_idx" ON "VerificationCode"("userId", "status", "type");
CREATE INDEX "VerificationCode_expiresAt_idx" ON "VerificationCode"("expiresAt");
