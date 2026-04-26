/*
  Warnings:

  - You are about to drop the column `fields` on the `SystemConfig` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SystemConfig" DROP COLUMN "fields";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "isActive" SET DEFAULT false;
