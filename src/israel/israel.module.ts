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

@Module({
  imports: [SeasonsModule],
  controllers: [
    IsraelFieldsController,
    IsraelFieldCategoriesController,
    IsraelSortCategoriesController,
    IsraelHarvestController,
    IsraelClassificationController,
    IsraelStockController,
  ],
  providers: [
    IsraelFieldsService,
    IsraelFieldCategoriesService,
    IsraelSortCategoriesService,
    IsraelHarvestService,
    IsraelClassificationService,
    IsraelStockService,
  ],
})
export class IsraelModule {}
