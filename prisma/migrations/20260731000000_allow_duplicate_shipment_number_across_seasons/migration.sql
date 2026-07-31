-- Allow the same shipment number to be reused across different seasons.
-- The per-season uniqueness is enforced by the composite index (seasonId, shipmentNumber).
DROP INDEX IF EXISTS "Shipment_shipmentNumber_key";
