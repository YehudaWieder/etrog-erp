ALTER TABLE "FieldHarvest"
  ADD COLUMN "totalAfterRejected" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "ownerAfterRejected" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "classifiedTotal" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isPartialClassification" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "notes" TEXT;

UPDATE "FieldHarvest" f
SET
  "totalAfterRejected" = GREATEST(f."totalHarvested" - f."totalRejected", 0),
  "ownerAfterRejected" = GREATEST(f."ownerHarvested" - f."ownerRejected", 0),
  "classifiedTotal" = COALESCE(
    (
      SELECT SUM(c."quantity")::int
      FROM "Classification" c
      WHERE c."fieldHarvestId" = f."id"
    ),
    0
  ),
  "isPartialClassification" = COALESCE(
    (
      SELECT SUM(c."quantity")::int
      FROM "Classification" c
      WHERE c."fieldHarvestId" = f."id"
    ),
    0
  ) < GREATEST(f."totalHarvested" - f."totalRejected", 0);
