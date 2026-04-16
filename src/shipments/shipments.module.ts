import { Module } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { ItemController } from './controllers/item/item.controller';
import { BoxController } from './controllers/box/box.controller';
import { ShipmentController } from './controllers/shipment/shipment.controller';
import { ItemService } from './services/item/item.service';
import { BoxService } from './services/box/box.service';
import { ShipmentService } from './services/shipment/shipment.service';

@Module({
  providers: [ShipmentsService, ShipmentService, BoxService, ItemService],
  controllers: [ShipmentController, BoxController, ItemController]
})
export class ShipmentsModule {}
