-- CreateTable
CREATE TABLE "IsraelSettings" (
    "id" SERIAL NOT NULL,
    "cartonCapacity" INTEGER NOT NULL DEFAULT 0,
    "updatedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsraelSettings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "IsraelSettings" ADD CONSTRAINT "IsraelSettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
