-- CreateEnum
CREATE TYPE "ShareConditionEndMode" AS ENUM ('EITHER', 'BOTH');

-- CreateEnum
CREATE TYPE "ShareConditionStatus" AS ENUM ('ACTIVE', 'DISABLED', 'ENDED');

-- DropIndex
DROP INDEX "TraderCategoryShare_traderId_traderCategoryId_seasonId_key";

-- AlterTable
ALTER TABLE "TraderCategoryShare" ADD COLUMN     "shareConditionId" INTEGER;

-- AlterTable
ALTER TABLE "TraderStock" ADD COLUMN     "shareConditionId" INTEGER;

-- CreateTable
CREATE TABLE "TraderCategoryShareCondition" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "traderCategoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "endQuantityThreshold" INTEGER,
    "endConditionMode" "ShareConditionEndMode" NOT NULL DEFAULT 'EITHER',
    "status" "ShareConditionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraderCategoryShareCondition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TraderCategoryShare_traderId_traderCategoryId_seasonId_shar_key" ON "TraderCategoryShare"("traderId", "traderCategoryId", "seasonId", "shareConditionId");

-- CreateIndex
CREATE INDEX "TraderStock_seasonId_shareConditionId_idx" ON "TraderStock"("seasonId", "shareConditionId");

-- AddForeignKey
ALTER TABLE "TraderCategoryShare" ADD CONSTRAINT "TraderCategoryShare_shareConditionId_fkey" FOREIGN KEY ("shareConditionId") REFERENCES "TraderCategoryShareCondition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraderCategoryShareCondition" ADD CONSTRAINT "TraderCategoryShareCondition_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraderCategoryShareCondition" ADD CONSTRAINT "TraderCategoryShareCondition_traderCategoryId_fkey" FOREIGN KEY ("traderCategoryId") REFERENCES "TradersCategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraderStock" ADD CONSTRAINT "TraderStock_shareConditionId_fkey" FOREIGN KEY ("shareConditionId") REFERENCES "TraderCategoryShareCondition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enforce exactly one default (non-condition) share row per (traderId, traderCategoryId, seasonId).
-- Prisma's @@unique can't express a partial/filtered index, so this is added manually: the
-- generated composite unique index above allows multiple NULL shareConditionId rows for the same
-- trader+category+season (Postgres treats NULLs as distinct), which this index closes.
CREATE UNIQUE INDEX "TraderCategoryShare_default_unique"
ON "TraderCategoryShare" ("traderId", "traderCategoryId", "seasonId")
WHERE "shareConditionId" IS NULL;
