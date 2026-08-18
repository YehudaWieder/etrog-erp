-- AlterTable
ALTER TABLE "IsraelClassification" ADD COLUMN     "fieldCategoryId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "IsraelClassification_fieldCategoryId_idx" ON "IsraelClassification"("fieldCategoryId");

-- AddForeignKey
ALTER TABLE "IsraelClassification" ADD CONSTRAINT "IsraelClassification_fieldCategoryId_fkey" FOREIGN KEY ("fieldCategoryId") REFERENCES "IsraelFieldCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
