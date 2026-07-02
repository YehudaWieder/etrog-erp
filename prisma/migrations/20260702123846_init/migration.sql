-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'MANAGER', 'EDITOR', 'WORKER');

-- CreateEnum
CREATE TYPE "PitamStatus" AS ENUM ('WITH_PITAM', 'WITHOUT_PITAM', 'MIXED');

-- CreateEnum
CREATE TYPE "Grade" AS ENUM ('א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ללא');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('GENERAL', 'TRADER', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('GENERAL', 'TRADER');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('HARVEST_IN', 'INTERNAL_TRANSFER', 'OWNERSHIP_TRANSFER', 'ASSIGNED', 'PRIVATE_SELECTION', 'PACKED_SHIPPED', 'SELF_PICKUP', 'WASTE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BoxStatus" AS ENUM ('OPEN', 'CLOSED', 'SHIPPED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "BoxType" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BoxOwnership" AS ENUM ('TRADER', 'CUSTOMER', 'SHARED', 'GENERAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ItemOwnership" AS ENUM ('TRADER', 'CUSTOMER', 'GENERAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('ILS', 'USD', 'EUR');

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "currency" "Currency",
    "unitPrice" DECIMAL(65,30),
    "smallBoxCapacity" INTEGER NOT NULL DEFAULT 50,
    "mediumBoxCapacity" INTEGER NOT NULL DEFAULT 30,
    "largeBoxCapacity" INTEGER NOT NULL DEFAULT 24,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Field" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefaultTraderCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "supportedGrades" "Grade"[],
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DefaultTraderCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefaultTraderCategoryShare" (
    "id" SERIAL NOT NULL,
    "traderId" INTEGER NOT NULL,
    "defaultTraderCategoryId" INTEGER NOT NULL,
    "percent" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DefaultTraderCategoryShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" SERIAL NOT NULL,
    "yearName" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'WORKER',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trader" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "paymentPercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Trader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "customerName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradersCategories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "seasonId" INTEGER NOT NULL,
    "supportedGrades" "Grade"[],
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradersCategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerCategories" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerCategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraderCategoryShare" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "traderId" INTEGER NOT NULL,
    "traderCategoryId" INTEGER NOT NULL,
    "percent" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraderCategoryShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldHarvest" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "dateGregorian" TIMESTAMP(3) NOT NULL,
    "dateHebrew" TEXT NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "updatedById" INTEGER NOT NULL,
    "totalHarvested" INTEGER NOT NULL DEFAULT 0,
    "totalRejected" INTEGER NOT NULL DEFAULT 0,
    "rejectionRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalAfterRejected" INTEGER NOT NULL DEFAULT 0,
    "ownerHarvested" INTEGER NOT NULL DEFAULT 0,
    "ownerRejected" INTEGER NOT NULL DEFAULT 0,
    "ownerRejectionRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "ownerAfterRejected" INTEGER NOT NULL DEFAULT 0,
    "classifiedTotal" INTEGER NOT NULL DEFAULT 0,
    "isPartialClassification" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FieldHarvest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classification" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "fieldHarvestId" INTEGER NOT NULL,
    "updatedById" INTEGER NOT NULL,
    "assignmentType" "AssignmentType" NOT NULL,
    "traderId" INTEGER,
    "customerId" INTEGER,
    "traderCategoryId" INTEGER,
    "customerCategoryId" INTEGER,
    "grade" "Grade",
    "pitamStatus" "PitamStatus" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Classification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraderStock" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "traderId" INTEGER,
    "traderCategoryId" INTEGER NOT NULL,
    "grade" "Grade" NOT NULL,
    "pitamStatus" "PitamStatus" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "isModulo" BOOLEAN NOT NULL DEFAULT false,
    "type" "MovementType" NOT NULL DEFAULT 'HARVEST_IN',
    "isFromPrivateSelection" BOOLEAN NOT NULL DEFAULT false,
    "MovementReferenceId" INTEGER,
    "shipmentId" INTEGER,
    "boxId" INTEGER,
    "notes" TEXT,
    "updatedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TraderStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAllocation" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dateHebrew" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "customerCategoryId" INTEGER NOT NULL,
    "pitamStatus" "PitamStatus" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "type" "MovementType" NOT NULL DEFAULT 'HARVEST_IN',
    "takenFrom" "SourceType" NOT NULL DEFAULT 'GENERAL',
    "traderId" INTEGER,
    "MovementReferenceId" INTEGER,
    "shipmentId" INTEGER,
    "boxId" INTEGER,
    "notes" TEXT,
    "updatedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CustomerAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
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
    "slug" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Box" (
    "id" SERIAL NOT NULL,
    "shipmentId" INTEGER NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "boxNumber" INTEGER NOT NULL,
    "boxType" "BoxType" NOT NULL,
    "totalQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" "BoxStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "ownershipType" "BoxOwnership" NOT NULL DEFAULT 'GENERAL',
    "traderId" INTEGER,
    "customerId" INTEGER,
    "updatedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Box_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentItem" (
    "id" SERIAL NOT NULL,
    "shipmentId" INTEGER NOT NULL,
    "boxId" INTEGER NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "traderCategoryId" INTEGER,
    "customerCategoryId" INTEGER,
    "grade" "Grade",
    "pitamStatus" "PitamStatus" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "customLabel" TEXT,
    "customGrade" TEXT,
    "ownershipType" "ItemOwnership" NOT NULL DEFAULT 'GENERAL',
    "generalSourceBreakdown" JSONB,
    "traderId" INTEGER,
    "customerId" INTEGER,
    "isPrivateSelection" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ShipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "senderId" INTEGER NOT NULL,
    "recipientIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "readByIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "replyToMessageId" INTEGER,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Field_slug_key" ON "Field"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Field_name_key" ON "Field"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DefaultTraderCategory_name_key" ON "DefaultTraderCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DefaultTraderCategoryShare_traderId_defaultTraderCategoryId_key" ON "DefaultTraderCategoryShare"("traderId", "defaultTraderCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Season_yearName_key" ON "Season"("yearName");

-- CreateIndex
CREATE UNIQUE INDEX "Season_slug_key" ON "Season"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_slug_key" ON "User"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Trader_name_key" ON "Trader"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Trader_slug_key" ON "Trader"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerName_key" ON "Customer"("customerName");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_slug_key" ON "Customer"("slug");

-- CreateIndex
CREATE INDEX "Customer_customerName_idx" ON "Customer"("customerName");

-- CreateIndex
CREATE UNIQUE INDEX "TradersCategories_name_seasonId_key" ON "TradersCategories"("name", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerCategories_seasonId_customerId_name_grade_key" ON "CustomerCategories"("seasonId", "customerId", "name", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "TraderCategoryShare_traderId_traderCategoryId_seasonId_key" ON "TraderCategoryShare"("traderId", "traderCategoryId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldHarvest_slug_key" ON "FieldHarvest"("slug");

-- CreateIndex
CREATE INDEX "FieldHarvest_seasonId_idx" ON "FieldHarvest"("seasonId");

-- CreateIndex
CREATE INDEX "FieldHarvest_seasonId_fieldId_idx" ON "FieldHarvest"("seasonId", "fieldId");

-- CreateIndex
CREATE INDEX "FieldHarvest_isDeleted_idx" ON "FieldHarvest"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "FieldHarvest_seasonId_dateGregorian_fieldId_key" ON "FieldHarvest"("seasonId", "dateGregorian", "fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "Classification_slug_key" ON "Classification"("slug");

-- CreateIndex
CREATE INDEX "Classification_seasonId_idx" ON "Classification"("seasonId");

-- CreateIndex
CREATE INDEX "Classification_seasonId_fieldHarvestId_idx" ON "Classification"("seasonId", "fieldHarvestId");

-- CreateIndex
CREATE INDEX "Classification_seasonId_assignmentType_idx" ON "Classification"("seasonId", "assignmentType");

-- CreateIndex
CREATE INDEX "Classification_seasonId_traderId_idx" ON "Classification"("seasonId", "traderId");

-- CreateIndex
CREATE INDEX "Classification_seasonId_customerId_idx" ON "Classification"("seasonId", "customerId");

-- CreateIndex
CREATE INDEX "Classification_isDeleted_idx" ON "Classification"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "Classification_fieldHarvestId_traderId_customerId_traderCat_key" ON "Classification"("fieldHarvestId", "traderId", "customerId", "traderCategoryId", "customerCategoryId", "grade", "assignmentType", "pitamStatus", "isDeleted");

-- CreateIndex
CREATE INDEX "TraderStock_seasonId_type_idx" ON "TraderStock"("seasonId", "type");

-- CreateIndex
CREATE INDEX "TraderStock_seasonId_traderId_type_idx" ON "TraderStock"("seasonId", "traderId", "type");

-- CreateIndex
CREATE INDEX "TraderStock_traderCategoryId_grade_pitamStatus_type_idx" ON "TraderStock"("traderCategoryId", "grade", "pitamStatus", "type");

-- CreateIndex
CREATE INDEX "TraderStock_isDeleted_idx" ON "TraderStock"("isDeleted");

-- CreateIndex
CREATE INDEX "CustomerAllocation_seasonId_type_idx" ON "CustomerAllocation"("seasonId", "type");

-- CreateIndex
CREATE INDEX "CustomerAllocation_seasonId_customerId_type_idx" ON "CustomerAllocation"("seasonId", "customerId", "type");

-- CreateIndex
CREATE INDEX "CustomerAllocation_customerId_traderId_type_idx" ON "CustomerAllocation"("customerId", "traderId", "type");

-- CreateIndex
CREATE INDEX "CustomerAllocation_customerCategoryId_pitamStatus_type_idx" ON "CustomerAllocation"("customerCategoryId", "pitamStatus", "type");

-- CreateIndex
CREATE INDEX "CustomerAllocation_isDeleted_idx" ON "CustomerAllocation"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_shipmentNumber_key" ON "Shipment"("shipmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_slug_key" ON "Shipment"("slug");

-- CreateIndex
CREATE INDEX "Shipment_seasonId_idx" ON "Shipment"("seasonId");

-- CreateIndex
CREATE INDEX "Shipment_seasonId_status_idx" ON "Shipment"("seasonId", "status");

-- CreateIndex
CREATE INDEX "Shipment_isDeleted_idx" ON "Shipment"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_seasonId_shipmentNumber_key" ON "Shipment"("seasonId", "shipmentNumber");

-- CreateIndex
CREATE INDEX "Box_seasonId_idx" ON "Box"("seasonId");

-- CreateIndex
CREATE INDEX "Box_shipmentId_idx" ON "Box"("shipmentId");

-- CreateIndex
CREATE INDEX "Box_traderId_idx" ON "Box"("traderId");

-- CreateIndex
CREATE INDEX "Box_customerId_idx" ON "Box"("customerId");

-- CreateIndex
CREATE INDEX "Box_seasonId_status_idx" ON "Box"("seasonId", "status");

-- CreateIndex
CREATE INDEX "Box_traderId_status_idx" ON "Box"("traderId", "status");

-- CreateIndex
CREATE INDEX "Box_customerId_status_idx" ON "Box"("customerId", "status");

-- CreateIndex
CREATE INDEX "Box_isDeleted_idx" ON "Box"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "Box_seasonId_boxNumber_key" ON "Box"("seasonId", "boxNumber");

-- CreateIndex
CREATE INDEX "ShipmentItem_shipmentId_idx" ON "ShipmentItem"("shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentItem_boxId_idx" ON "ShipmentItem"("boxId");

-- CreateIndex
CREATE INDEX "ShipmentItem_seasonId_idx" ON "ShipmentItem"("seasonId");

-- CreateIndex
CREATE INDEX "ShipmentItem_customerId_idx" ON "ShipmentItem"("customerId");

-- CreateIndex
CREATE INDEX "ShipmentItem_seasonId_shipmentId_idx" ON "ShipmentItem"("seasonId", "shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentItem_traderId_shipmentId_idx" ON "ShipmentItem"("traderId", "shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentItem_customerId_shipmentId_idx" ON "ShipmentItem"("customerId", "shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentItem_isDeleted_idx" ON "ShipmentItem"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentItem_seasonId_boxId_traderCategoryId_customerCatego_key" ON "ShipmentItem"("seasonId", "boxId", "traderCategoryId", "customerCategoryId", "grade", "pitamStatus", "ownershipType", "traderId", "customerId", "isPrivateSelection", "isDeleted");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_replyToMessageId_idx" ON "Message"("replyToMessageId");

-- AddForeignKey
ALTER TABLE "SystemConfig" ADD CONSTRAINT "SystemConfig_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefaultTraderCategoryShare" ADD CONSTRAINT "DefaultTraderCategoryShare_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "Trader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefaultTraderCategoryShare" ADD CONSTRAINT "DefaultTraderCategoryShare_defaultTraderCategoryId_fkey" FOREIGN KEY ("defaultTraderCategoryId") REFERENCES "DefaultTraderCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradersCategories" ADD CONSTRAINT "TradersCategories_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerCategories" ADD CONSTRAINT "CustomerCategories_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerCategories" ADD CONSTRAINT "CustomerCategories_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraderCategoryShare" ADD CONSTRAINT "TraderCategoryShare_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraderCategoryShare" ADD CONSTRAINT "TraderCategoryShare_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "Trader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraderCategoryShare" ADD CONSTRAINT "TraderCategoryShare_traderCategoryId_fkey" FOREIGN KEY ("traderCategoryId") REFERENCES "TradersCategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldHarvest" ADD CONSTRAINT "FieldHarvest_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldHarvest" ADD CONSTRAINT "FieldHarvest_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldHarvest" ADD CONSTRAINT "FieldHarvest_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classification" ADD CONSTRAINT "Classification_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classification" ADD CONSTRAINT "Classification_fieldHarvestId_fkey" FOREIGN KEY ("fieldHarvestId") REFERENCES "FieldHarvest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classification" ADD CONSTRAINT "Classification_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classification" ADD CONSTRAINT "Classification_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "Trader"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classification" ADD CONSTRAINT "Classification_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classification" ADD CONSTRAINT "Classification_traderCategoryId_fkey" FOREIGN KEY ("traderCategoryId") REFERENCES "TradersCategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classification" ADD CONSTRAINT "Classification_customerCategoryId_fkey" FOREIGN KEY ("customerCategoryId") REFERENCES "CustomerCategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraderStock" ADD CONSTRAINT "TraderStock_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraderStock" ADD CONSTRAINT "TraderStock_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "Trader"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraderStock" ADD CONSTRAINT "TraderStock_traderCategoryId_fkey" FOREIGN KEY ("traderCategoryId") REFERENCES "TradersCategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraderStock" ADD CONSTRAINT "TraderStock_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "Box"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraderStock" ADD CONSTRAINT "TraderStock_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAllocation" ADD CONSTRAINT "CustomerAllocation_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAllocation" ADD CONSTRAINT "CustomerAllocation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAllocation" ADD CONSTRAINT "CustomerAllocation_customerCategoryId_fkey" FOREIGN KEY ("customerCategoryId") REFERENCES "CustomerCategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAllocation" ADD CONSTRAINT "CustomerAllocation_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "Trader"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAllocation" ADD CONSTRAINT "CustomerAllocation_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Box" ADD CONSTRAINT "Box_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Box" ADD CONSTRAINT "Box_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Box" ADD CONSTRAINT "Box_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "Trader"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Box" ADD CONSTRAINT "Box_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Box" ADD CONSTRAINT "Box_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "Box"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_traderCategoryId_fkey" FOREIGN KEY ("traderCategoryId") REFERENCES "TradersCategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_customerCategoryId_fkey" FOREIGN KEY ("customerCategoryId") REFERENCES "CustomerCategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "Trader"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
