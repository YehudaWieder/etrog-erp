-- AlterColumn: change grade from Grade enum to TEXT to support free-text grades on CUSTOM items
ALTER TABLE "ShipmentItem" ALTER COLUMN "grade" TYPE TEXT;
