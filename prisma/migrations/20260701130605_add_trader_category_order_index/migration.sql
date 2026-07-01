-- AlterTable
ALTER TABLE "DefaultTraderCategory" ADD COLUMN     "orderIndex" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TradersCategories" ADD COLUMN     "orderIndex" INTEGER NOT NULL DEFAULT 0;
