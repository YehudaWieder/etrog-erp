-- AlterTable
ALTER TABLE "TraderStock" ADD COLUMN     "pitamSplitBatchId" UUID;

-- CreateIndex
CREATE INDEX "TraderStock_pitamSplitBatchId_idx" ON "TraderStock"("pitamSplitBatchId");
