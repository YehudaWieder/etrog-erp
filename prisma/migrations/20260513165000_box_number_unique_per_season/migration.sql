-- Drop previous uniqueness scope (season + shipment + box number)
ALTER TABLE "Box"
DROP CONSTRAINT IF EXISTS "Box_seasonId_shipmentId_boxNumber_key";

-- Enforce season-level box number uniqueness
ALTER TABLE "Box"
ADD CONSTRAINT "Box_seasonId_boxNumber_key" UNIQUE ("seasonId", "boxNumber");
