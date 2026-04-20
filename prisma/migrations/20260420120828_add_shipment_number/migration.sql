/*
  Warnings:

  - A unique constraint covering the columns `[seasonId,shipmentId,boxNumber]` on the table `Box` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[seasonId,shipmentNumber]` on the table `Shipment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[seasonId,boxId,traderCategoryId,customerCategoryId,grade,pitamStatus,ownershipType,traderId,customerId]` on the table `ShipmentItem` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Box_shipmentId_boxNumber_key";

-- DropIndex
DROP INDEX "Shipment_seasonId_id_key";

-- DropIndex
DROP INDEX "ShipmentItem_boxId_traderCategoryId_customerCategoryId_grad_key";

-- CreateIndex
CREATE UNIQUE INDEX "Box_seasonId_shipmentId_boxNumber_key" ON "Box"("seasonId", "shipmentId", "boxNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_seasonId_shipmentNumber_key" ON "Shipment"("seasonId", "shipmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentItem_seasonId_boxId_traderCategoryId_customerCatego_key" ON "ShipmentItem"("seasonId", "boxId", "traderCategoryId", "customerCategoryId", "grade", "pitamStatus", "ownershipType", "traderId", "customerId");
