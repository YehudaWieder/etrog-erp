-- Add isDefault field to TradersCategories table
ALTER TABLE "TradersCategories" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
