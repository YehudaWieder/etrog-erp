-- AlterTable
ALTER TABLE "FieldHarvest" ADD COLUMN     "uncalculatedRejected" INTEGER NOT NULL DEFAULT 0;

-- Backfill: rows previously flagged as bad picks had their entire rejected quantity
-- excluded from the rejection-rate calculation, so preserve that behavior.
UPDATE "FieldHarvest" SET "uncalculatedRejected" = "totalRejected" WHERE "isBadPick" = true;

-- AlterTable
ALTER TABLE "FieldHarvest" DROP COLUMN "isBadPick";
