import { Module } from '@nestjs/common';
import { InventoryController } from './controllers/inventory.controller';
import { InventoryService } from './services/inventory.service';
import { TraderStockService } from './services/trader-stock/trader-stock.service';
import { TraderStockSummaryService } from './services/trader-stock/trader-stock-summary.service';
import { CustomerAllocationService } from './services/customer-allocation/customer-allocation.service';
import { CustomerAllocationSummaryService } from './services/customer-allocation/customer-allocation-summary.service';
import { InventoryAvailabilityService } from './services/inventory-availability.service';
import { CustomerGeneralTransferService } from './services/customer-general-transfer/customer-general-transfer.service';
import { InternalTransferService } from './services/internal-transfer/internal-transfer.service';
import { CombinedSummaryService } from './services/combined-summary/combined-summary.service';
import { InventoryValidationService } from './services/validation/inventory-validation.service';
import { TraderStockSummaryRepository } from './services/trader-stock/trader-stock-summary.repository';
import { CustomerAllocationSummaryRepository } from './services/customer-allocation/customer-allocation-summary.repository';
import { CombinedSummaryRepository } from './services/combined-summary/combined-summary.repository';
import { TraderStockController } from './controllers/trader-stock/trader-stock.controller';
import { CustomerAllocationController } from './controllers/customer-allocation/customer-allocation.controller';
import { SeasonsModule } from 'src/seasons/seasons.module';

@Module({
  imports: [SeasonsModule],
  controllers: [InventoryController, TraderStockController, CustomerAllocationController],
  providers: [
    InventoryService,
    TraderStockService,
    TraderStockSummaryService,
    TraderStockSummaryRepository,
    CustomerAllocationService,
    CustomerAllocationSummaryService,
    CustomerAllocationSummaryRepository,
    InventoryAvailabilityService,
    CombinedSummaryService,
    CombinedSummaryRepository,
    InternalTransferService,
    CustomerGeneralTransferService,
    InventoryValidationService,
  ],
  exports: [InventoryAvailabilityService],
})
export class InventoryModule {}
