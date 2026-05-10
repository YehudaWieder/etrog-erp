-- CreateTable
CREATE TABLE "TraderCategoryTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraderCategoryTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraderCategoryShareTemplate" (
    "id" SERIAL NOT NULL,
    "traderId" INTEGER NOT NULL,
    "traderCategoryTemplateId" INTEGER NOT NULL,
    "percent" DECIMAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraderCategoryShareTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TraderCategoryTemplate_name_key" ON "TraderCategoryTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TraderCategoryShareTemplate_traderId_traderCategoryTemplateId_key" ON "TraderCategoryShareTemplate"("traderId", "traderCategoryTemplateId");

-- AddForeignKey
ALTER TABLE "TraderCategoryShareTemplate" ADD CONSTRAINT "TraderCategoryShareTemplate_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "Trader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraderCategoryShareTemplate" ADD CONSTRAINT "TraderCategoryShareTemplate_traderCategoryTemplateId_fkey" FOREIGN KEY ("traderCategoryTemplateId") REFERENCES "TraderCategoryTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
