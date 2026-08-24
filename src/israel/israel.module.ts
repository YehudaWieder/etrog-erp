import { Module } from '@nestjs/common';
import { SeasonsModule } from 'src/seasons/seasons.module';
import { IsraelFieldsService } from './settings/services/fields/fields.service';
import { IsraelFieldsController } from './settings/controllers/fields/fields.controller';
import { IsraelFieldCategoriesService } from './settings/services/field-categories/field-categories.service';
import { IsraelFieldCategoriesController } from './settings/controllers/field-categories/field-categories.controller';
import { IsraelSortCategoriesService } from './settings/services/sort-categories/sort-categories.service';
import { IsraelSortCategoriesController } from './settings/controllers/sort-categories/sort-categories.controller';
import { IsraelHarvestService } from './harvest/israel-harvest.service';
import { IsraelHarvestController } from './harvest/israel-harvest.controller';
import { IsraelClassificationService } from './classification/israel-classification.service';
import { IsraelClassificationController } from './classification/israel-classification.controller';
import { IsraelStockService } from './stock/israel-stock.service';
import { IsraelStockController } from './stock/israel-stock.controller';
import { IsraelShipmentService } from './shipment/israel-shipment.service';
import { IsraelShipmentController } from './shipment/israel-shipment.controller';
import { IsraelBoxService } from './box/israel-box.service';
import { IsraelBoxController } from './box/israel-box.controller';
import { IsraelShipmentItemService } from './shipment-item/israel-shipment-item.service';
import { IsraelShipmentItemController } from './shipment-item/israel-shipment-item.controller';
import { IsraelSettingsService } from './settings/services/general/israel-settings.service';
import { IsraelSettingsController } from './settings/controllers/general/israel-settings.controller';
import { IsraelDashboardService } from './dashboard/israel-dashboard.service';
import { IsraelDashboardController } from './dashboard/israel-dashboard.controller';

@Module({
  imports: [SeasonsModule],
  controllers: [
    IsraelFieldsController,
    IsraelFieldCategoriesController,
    IsraelSortCategoriesController,
    IsraelHarvestController,
    IsraelClassificationController,
    IsraelStockController,
    IsraelShipmentController,
    IsraelBoxController,
    IsraelShipmentItemController,
    IsraelSettingsController,
    IsraelDashboardController,
  ],
  providers: [
    IsraelFieldsService,
    IsraelFieldCategoriesService,
    IsraelSortCategoriesService,
    IsraelHarvestService,
    IsraelClassificationService,
    IsraelStockService,
    IsraelShipmentService,
    IsraelBoxService,
    IsraelShipmentItemService,
    IsraelSettingsService,
    IsraelDashboardService,
  ],
})
export class IsraelModule {}
