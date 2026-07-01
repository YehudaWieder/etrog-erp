-- DropIndex
DROP INDEX "ShipmentItem_seasonId_boxId_traderCategoryId_customerCatego_key";

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentItem_seasonId_boxId_traderCategoryId_customerCatego_key" ON "ShipmentItem"("seasonId", "boxId", "traderCategoryId", "customerCategoryId", "grade", "pitamStatus", "ownershipType", "traderId", "customerId", "isPrivateSelection", "isDeleted");
