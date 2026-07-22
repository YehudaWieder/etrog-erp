-- AlterEnum
ALTER TYPE "BoxOwnership" ADD VALUE 'EXTERNAL_TRADER';

-- AlterTable
ALTER TABLE "Box" ADD COLUMN     "externalOwnerName" TEXT;
