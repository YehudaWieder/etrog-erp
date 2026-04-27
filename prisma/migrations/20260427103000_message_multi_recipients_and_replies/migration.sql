-- Add new fields first so we can migrate existing data safely
ALTER TABLE "Message"
ADD COLUMN "recipientIds" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN "readByIds" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN "replyToMessageId" INTEGER;

-- Migrate existing single-recipient data into arrays
UPDATE "Message"
SET "recipientIds" = CASE
  WHEN "recipientId" IS NULL THEN ARRAY[]::INTEGER[]
  ELSE ARRAY["recipientId"]
END;

-- Migrate existing read flag into read-by list
UPDATE "Message"
SET "readByIds" = CASE
  WHEN "isRead" = TRUE AND "recipientId" IS NOT NULL THEN ARRAY["recipientId"]
  ELSE ARRAY[]::INTEGER[]
END;

-- Drop old indexes based on old columns
DROP INDEX IF EXISTS "Message_recipientId_idx";
DROP INDEX IF EXISTS "Message_recipientId_isRead_idx";

-- Drop old columns
ALTER TABLE "Message"
DROP COLUMN "recipientId",
DROP COLUMN "isRead";

-- Add new index and self-reference foreign key for replies
CREATE INDEX "Message_replyToMessageId_idx" ON "Message"("replyToMessageId");

ALTER TABLE "Message"
ADD CONSTRAINT "Message_replyToMessageId_fkey"
FOREIGN KEY ("replyToMessageId") REFERENCES "Message"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
