import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { ClassificationService } from './services/classification/classification.service';
import { TraderStockService } from './services/trader-stock/trader-stock.service';
import { CustomerAllocationService } from './services/customer-allocation/customer-allocation.service';
import { ClassificationController } from './controllers/classification/classification.controller';
import { TraderStockController } from './controllers/trader-stock/trader-stock.controller';
import { CustomerAllocationController } from './controllers/customer-allocation/customer-allocation.controller';

@Module({
  controllers: [InventoryController, ClassificationController, TraderStockController, CustomerAllocationController],
  providers: [InventoryService, ClassificationService, TraderStockService, CustomerAllocationService]
})
export class InventoryModule {}
