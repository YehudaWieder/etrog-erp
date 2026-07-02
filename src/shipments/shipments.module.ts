import { Module } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { ItemController } from './controllers/item/item.controller';
import { BoxController } from './controllers/box/box.controller';
import { ShipmentController } from './controllers/shipment/shipment.controller';
import { ItemService } from './services/item/item.service';
import { ItemCleanupService } from './services/item/item-cleanup.service';
import { BoxService } from './services/box/box.service';
import { BoxPackingWorkflowService } from './services/box/box-packing-workflow.service';
import { ShipmentService } from './services/shipment/shipment.service';
import { SeasonsModule } from 'src/seasons/seasons.module';
import { InventoryModule } from 'src/inventory/inventory.module';


@Module({
  imports: [SeasonsModule, InventoryModule],
  providers: [ShipmentsService, ShipmentService, BoxService, BoxPackingWorkflowService, ItemService, ItemCleanupService],
  controllers: [ShipmentController, BoxController, ItemController]
})
export class ShipmentsModule {}
