-- Drop previous uniqueness scope (season + shipment + box number)
ALTER TABLE "Box"
DROP CONSTRAINT IF EXISTS "Box_seasonId_shipmentId_boxNumber_key";

-- Remove duplicate (seasonId, boxNumber) rows, keeping only the one with the highest id
DELETE FROM "Box"
WHERE id NOT IN (
  SELECT MAX(id)
  FROM "Box"
  GROUP BY "seasonId", "boxNumber"
);

-- Enforce season-level box number uniqueness
ALTER TABLE "Box"
ADD CONSTRAINT "Box_seasonId_boxNumber_key" UNIQUE ("seasonId", "boxNumber");
