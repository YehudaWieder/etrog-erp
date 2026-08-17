-- CreateEnum
CREATE TYPE "IsraelMovementType" AS ENUM ('HARVEST_IN', 'PACKED_SHIPPED', 'SELF_PICKUP', 'WASTE', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "IsraelField" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "updatedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsraelField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsraelFieldCategory" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL,
    "notes" TEXT,
    "updatedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsraelFieldCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsraelSortCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "updatedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsraelSortCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsraelCategoryGrade" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "grades" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "updatedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsraelCategoryGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsraelHarvest" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "dateGregorian" TIMESTAMP(3) NOT NULL,
    "dateHebrew" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "updatedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsraelHarvest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsraelClassification" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "harvestId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "pitamStatus" "PitamStatus" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "updatedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsraelClassification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsraelShipment" (
    "id" SERIAL NOT NULL,
    "shipmentNumber" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "totalBoxes" INTEGER NOT NULL DEFAULT 0,
    "totalQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PREPARING',
    "shippedAt" TIMESTAMP(3),
    "notes" TEXT,
    "updatedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsraelShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsraelBox" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "shipmentId" INTEGER,
    "boxNumber" INTEGER NOT NULL,
    "itemsCount" INTEGER NOT NULL DEFAULT 0,
    "status" "BoxStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "updatedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsraelBox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsraelShipmentItem" (
    "id" SERIAL NOT NULL,
    "boxId" INTEGER NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "pitamStatus" "PitamStatus" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "updatedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsraelShipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsraelStock" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "fieldId" INTEGER,
    "categoryId" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "pitamStatus" "PitamStatus" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "type" "IsraelMovementType" NOT NULL DEFAULT 'HARVEST_IN',
    "movementReferenceId" INTEGER,
    "boxId" INTEGER,
    "notes" TEXT,
    "updatedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "IsraelStock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IsraelField_name_key" ON "IsraelField"("name");

-- CreateIndex
CREATE INDEX "IsraelField_name_idx" ON "IsraelField"("name");

-- CreateIndex
CREATE INDEX "IsraelFieldCategory_seasonId_idx" ON "IsraelFieldCategory"("seasonId");

-- CreateIndex
CREATE INDEX "IsraelFieldCategory_seasonId_fieldId_idx" ON "IsraelFieldCategory"("seasonId", "fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "IsraelFieldCategory_seasonId_fieldId_name_key" ON "IsraelFieldCategory"("seasonId", "fieldId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "IsraelSortCategory_name_key" ON "IsraelSortCategory"("name");

-- CreateIndex
CREATE INDEX "IsraelSortCategory_name_idx" ON "IsraelSortCategory"("name");

-- CreateIndex
CREATE INDEX "IsraelCategoryGrade_seasonId_idx" ON "IsraelCategoryGrade"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "IsraelCategoryGrade_seasonId_categoryId_key" ON "IsraelCategoryGrade"("seasonId", "categoryId");

-- CreateIndex
CREATE INDEX "IsraelHarvest_seasonId_idx" ON "IsraelHarvest"("seasonId");

-- CreateIndex
CREATE INDEX "IsraelHarvest_seasonId_fieldId_idx" ON "IsraelHarvest"("seasonId", "fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "IsraelHarvest_seasonId_fieldId_dateGregorian_key" ON "IsraelHarvest"("seasonId", "fieldId", "dateGregorian");

-- CreateIndex
CREATE INDEX "IsraelClassification_seasonId_idx" ON "IsraelClassification"("seasonId");

-- CreateIndex
CREATE INDEX "IsraelClassification_seasonId_harvestId_idx" ON "IsraelClassification"("seasonId", "harvestId");

-- CreateIndex
CREATE INDEX "IsraelClassification_categoryId_idx" ON "IsraelClassification"("categoryId");

-- CreateIndex
CREATE INDEX "IsraelShipment_seasonId_idx" ON "IsraelShipment"("seasonId");

-- CreateIndex
CREATE INDEX "IsraelShipment_seasonId_status_idx" ON "IsraelShipment"("seasonId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "IsraelShipment_seasonId_shipmentNumber_key" ON "IsraelShipment"("seasonId", "shipmentNumber");

-- CreateIndex
CREATE INDEX "IsraelBox_seasonId_idx" ON "IsraelBox"("seasonId");

-- CreateIndex
CREATE INDEX "IsraelBox_shipmentId_idx" ON "IsraelBox"("shipmentId");

-- CreateIndex
CREATE INDEX "IsraelBox_seasonId_status_idx" ON "IsraelBox"("seasonId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "IsraelBox_seasonId_boxNumber_key" ON "IsraelBox"("seasonId", "boxNumber");

-- CreateIndex
CREATE INDEX "IsraelShipmentItem_boxId_idx" ON "IsraelShipmentItem"("boxId");

-- CreateIndex
CREATE INDEX "IsraelShipmentItem_seasonId_idx" ON "IsraelShipmentItem"("seasonId");

-- CreateIndex
CREATE INDEX "IsraelShipmentItem_categoryId_idx" ON "IsraelShipmentItem"("categoryId");

-- CreateIndex
CREATE INDEX "IsraelStock_seasonId_type_idx" ON "IsraelStock"("seasonId", "type");

-- CreateIndex
CREATE INDEX "IsraelStock_seasonId_fieldId_type_idx" ON "IsraelStock"("seasonId", "fieldId", "type");

-- CreateIndex
CREATE INDEX "IsraelStock_categoryId_grade_pitamStatus_type_idx" ON "IsraelStock"("categoryId", "grade", "pitamStatus", "type");

-- CreateIndex
CREATE INDEX "IsraelStock_isDeleted_idx" ON "IsraelStock"("isDeleted");

-- AddForeignKey
ALTER TABLE "IsraelField" ADD CONSTRAINT "IsraelField_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelFieldCategory" ADD CONSTRAINT "IsraelFieldCategory_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelFieldCategory" ADD CONSTRAINT "IsraelFieldCategory_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "IsraelField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelFieldCategory" ADD CONSTRAINT "IsraelFieldCategory_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelSortCategory" ADD CONSTRAINT "IsraelSortCategory_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelCategoryGrade" ADD CONSTRAINT "IsraelCategoryGrade_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelCategoryGrade" ADD CONSTRAINT "IsraelCategoryGrade_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "IsraelSortCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelCategoryGrade" ADD CONSTRAINT "IsraelCategoryGrade_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelHarvest" ADD CONSTRAINT "IsraelHarvest_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelHarvest" ADD CONSTRAINT "IsraelHarvest_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "IsraelField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelHarvest" ADD CONSTRAINT "IsraelHarvest_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelClassification" ADD CONSTRAINT "IsraelClassification_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelClassification" ADD CONSTRAINT "IsraelClassification_harvestId_fkey" FOREIGN KEY ("harvestId") REFERENCES "IsraelHarvest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelClassification" ADD CONSTRAINT "IsraelClassification_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "IsraelSortCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelClassification" ADD CONSTRAINT "IsraelClassification_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelShipment" ADD CONSTRAINT "IsraelShipment_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelShipment" ADD CONSTRAINT "IsraelShipment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelBox" ADD CONSTRAINT "IsraelBox_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelBox" ADD CONSTRAINT "IsraelBox_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "IsraelShipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelBox" ADD CONSTRAINT "IsraelBox_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelShipmentItem" ADD CONSTRAINT "IsraelShipmentItem_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "IsraelBox"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelShipmentItem" ADD CONSTRAINT "IsraelShipmentItem_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelShipmentItem" ADD CONSTRAINT "IsraelShipmentItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "IsraelSortCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelShipmentItem" ADD CONSTRAINT "IsraelShipmentItem_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelStock" ADD CONSTRAINT "IsraelStock_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelStock" ADD CONSTRAINT "IsraelStock_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "IsraelField"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelStock" ADD CONSTRAINT "IsraelStock_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "IsraelSortCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelStock" ADD CONSTRAINT "IsraelStock_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "IsraelBox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsraelStock" ADD CONSTRAINT "IsraelStock_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
