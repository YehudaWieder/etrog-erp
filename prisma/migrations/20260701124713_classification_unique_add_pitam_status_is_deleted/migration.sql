-- DropIndex
DROP INDEX "Classification_fieldHarvestId_traderId_customerId_traderCat_key";

-- CreateIndex
CREATE UNIQUE INDEX "Classification_fieldHarvestId_traderId_customerId_traderCat_key" ON "Classification"("fieldHarvestId", "traderId", "customerId", "traderCategoryId", "customerCategoryId", "grade", "assignmentType", "pitamStatus", "isDeleted");
