-- Revert grade column back to Grade enum (values are still valid enum strings or NULL)
ALTER TABLE "ShipmentItem" ALTER COLUMN "grade" TYPE "Grade" USING "grade"::"Grade";

-- Add customGrade column for free-text grade on CUSTOM ownership items
ALTER TABLE "ShipmentItem" ADD COLUMN "customGrade" TEXT;
