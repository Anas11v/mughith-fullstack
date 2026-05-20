-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "ambulanceCrew" TEXT,
ADD COLUMN     "ambulanceEta" TEXT,
ADD COLUMN     "ambulancePlate" TEXT,
ADD COLUMN     "panicTriggered" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "cases_status_idx" ON "cases"("status");

-- CreateIndex
CREATE INDEX "cases_status_expiresAt_idx" ON "cases"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "cases_assignedToId_idx" ON "cases"("assignedToId");

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "users_role_isAvailable_isBusy_idx" ON "users"("role", "isAvailable", "isBusy");
