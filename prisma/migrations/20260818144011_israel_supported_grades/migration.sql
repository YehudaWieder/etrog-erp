-- DropForeignKey
ALTER TABLE "IsraelCategoryGrade" DROP CONSTRAINT "IsraelCategoryGrade_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "IsraelCategoryGrade" DROP CONSTRAINT "IsraelCategoryGrade_seasonId_fkey";

-- DropForeignKey
ALTER TABLE "IsraelCategoryGrade" DROP CONSTRAINT "IsraelCategoryGrade_updatedById_fkey";

-- AlterTable
ALTER TABLE "IsraelSortCategory" ADD COLUMN     "gradeGroups" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "supportedGrades" "Grade"[];

-- DropTable
DROP TABLE "IsraelCategoryGrade";

