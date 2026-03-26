import { Module } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { ItemManagerController } from './controllers/item-manager/item-manager.controller';
import { BoxManagerController } from './controllers/box-manager/box-manager.controller';
import { ShipmentCoreController } from './controllers/shipment-core/shipment-core.controller';
import { ItemManagerService } from './services/item-manager/item-manager.service';
import { BoxManagerService } from './services/box-manager/box-manager.service';
import { ShipmentCoreService } from './services/shipment-core/shipment-core.service';
import { ShipmentsService } from './shipments.service';

@Module({
  providers: [ShipmentsService, ShipmentCoreService, BoxManagerService, ItemManagerService],
  controllers: [ShipmentCoreController, BoxManagerController, ItemManagerController]
})
export class ShipmentsModule {}
