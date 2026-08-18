
-- AlterTable
ALTER TABLE "IsraelClassification" DROP COLUMN "grade",
ADD COLUMN     "grade" "Grade" NOT NULL;

-- AlterTable
ALTER TABLE "IsraelShipmentItem" DROP COLUMN "grade",
ADD COLUMN     "grade" "Grade" NOT NULL;

-- AlterTable
ALTER TABLE "IsraelStock" DROP COLUMN "grade",
ADD COLUMN     "grade" "Grade" NOT NULL;

-- CreateIndex
CREATE INDEX "IsraelStock_categoryId_grade_pitamStatus_type_idx" ON "IsraelStock"("categoryId", "grade", "pitamStatus", "type");

