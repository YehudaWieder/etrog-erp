-- AlterTable: add fieldId as nullable first, backfill, then enforce NOT NULL.
ALTER TABLE "IsraelShipment" ADD COLUMN "fieldId" INTEGER;
ALTER TABLE "IsraelBox" ADD COLUMN "fieldId" INTEGER;

-- Backfill existing rows to field #2 (קירשנבוים), the only field with data at migration time.
UPDATE "IsraelShipment" SET "fieldId" = 2 WHERE "fieldId" IS NULL;
UPDATE "IsraelBox" SET "fieldId" = 2 WHERE "fieldId" IS NULL;

ALTER TABLE "IsraelShipment" ALTER COLUMN "fieldId" SET NOT NULL;
ALTER TABLE "IsraelBox" ALTER COLUMN "fieldId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "IsraelShipment_fieldId_idx" ON "IsraelShipment"("fieldId");
CREATE INDEX "IsraelBox_fieldId_idx" ON "IsraelBox"("fieldId");

-- AddForeignKey
ALTER TABLE "IsraelShipment" ADD CONSTRAINT "IsraelShipment_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "IsraelField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IsraelBox" ADD CONSTRAINT "IsraelBox_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "IsraelField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
