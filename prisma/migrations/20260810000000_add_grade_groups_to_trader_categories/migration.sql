-- AlterTable
ALTER TABLE "TradersCategories" ADD COLUMN "gradeGroups" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "DefaultTraderCategory" ADD COLUMN "gradeGroups" JSONB NOT NULL DEFAULT '[]';
