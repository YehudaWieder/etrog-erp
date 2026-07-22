-- CreateTable
CREATE TABLE "TraderSeasonSettings" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "traderId" INTEGER NOT NULL,
    "paymentPercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "pricePerEtrog" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraderSeasonSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TraderSeasonSettings_traderId_seasonId_key" ON "TraderSeasonSettings"("traderId", "seasonId");

-- AddForeignKey
ALTER TABLE "TraderSeasonSettings" ADD CONSTRAINT "TraderSeasonSettings_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraderSeasonSettings" ADD CONSTRAINT "TraderSeasonSettings_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "Trader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: carry each existing Trader's paymentPercent into the active season
-- (falls back to the most recently created season if none is marked active).
INSERT INTO "TraderSeasonSettings" ("seasonId", "traderId", "paymentPercent", "pricePerEtrog", "currency", "updatedAt")
SELECT
  COALESCE(
    (SELECT "id" FROM "Season" WHERE "isActive" = true ORDER BY "id" ASC LIMIT 1),
    (SELECT "id" FROM "Season" ORDER BY "id" DESC LIMIT 1)
  ) AS "seasonId",
  t."id" AS "traderId",
  t."paymentPercent",
  0 AS "pricePerEtrog",
  COALESCE(
    (SELECT sc."currency" FROM "SystemConfig" sc
      WHERE sc."seasonId" = COALESCE(
        (SELECT "id" FROM "Season" WHERE "isActive" = true ORDER BY "id" ASC LIMIT 1),
        (SELECT "id" FROM "Season" ORDER BY "id" DESC LIMIT 1)
      )
      AND sc."currency" IS NOT NULL
      ORDER BY sc."updatedAt" DESC LIMIT 1),
    'ILS'
  ) AS "currency",
  CURRENT_TIMESTAMP AS "updatedAt"
FROM "Trader" t
WHERE EXISTS (SELECT 1 FROM "Season");

-- AlterTable
ALTER TABLE "Trader" DROP COLUMN "paymentPercent";
