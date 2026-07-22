-- AlterTable
ALTER TABLE "FieldHarvest" ADD COLUMN     "isBadPick" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Field" DROP COLUMN "includeInRejectionSummary";
