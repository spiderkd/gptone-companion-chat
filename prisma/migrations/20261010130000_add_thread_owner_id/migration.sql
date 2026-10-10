ALTER TABLE "Thread" ADD COLUMN "ownerId" TEXT NOT NULL DEFAULT 'legacy';

CREATE INDEX "Thread_ownerId_updatedAt_idx" ON "Thread"("ownerId", "updatedAt");
