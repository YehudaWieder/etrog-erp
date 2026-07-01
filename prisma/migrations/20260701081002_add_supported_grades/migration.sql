-- AlterEnum
ALTER TYPE "Grade" ADD VALUE 'ללא';

-- AlterTable
ALTER TABLE "DefaultTraderCategory" ADD COLUMN     "supportedGrades" "Grade"[];

-- AlterTable
ALTER TABLE "TradersCategories" ADD COLUMN     "supportedGrades" "Grade"[];
