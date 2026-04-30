import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { TraderStockService } from './services/trader-stock/trader-stock.service';
import { CustomerAllocationService } from './services/customer-allocation/customer-allocation.service';
import { TraderStockController } from './controllers/trader-stock/trader-stock.controller';
import { CustomerAllocationController } from './controllers/customer-allocation/customer-allocation.controller';
import { SeasonsModule } from 'src/seasons/seasons.module';

@Module({
  imports: [SeasonsModule],
  controllers: [InventoryController, TraderStockController, CustomerAllocationController],
  providers: [InventoryService, TraderStockService, CustomerAllocationService]
})
export class InventoryModule {}
