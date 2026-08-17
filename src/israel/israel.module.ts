import { Module } from '@nestjs/common';
import { SeasonsModule } from 'src/seasons/seasons.module';
import { IsraelFieldsService } from './settings/services/fields/fields.service';
import { IsraelFieldsController } from './settings/controllers/fields/fields.controller';
import { IsraelFieldCategoriesService } from './settings/services/field-categories/field-categories.service';
import { IsraelFieldCategoriesController } from './settings/controllers/field-categories/field-categories.controller';
import { IsraelSortCategoriesService } from './settings/services/sort-categories/sort-categories.service';
import { IsraelSortCategoriesController } from './settings/controllers/sort-categories/sort-categories.controller';
import { IsraelCategoryGradesService } from './settings/services/category-grades/category-grades.service';
import { IsraelCategoryGradesController } from './settings/controllers/category-grades/category-grades.controller';

@Module({
  imports: [SeasonsModule],
  controllers: [
    IsraelFieldsController,
    IsraelFieldCategoriesController,
    IsraelSortCategoriesController,
    IsraelCategoryGradesController,
  ],
  providers: [
    IsraelFieldsService,
    IsraelFieldCategoriesService,
    IsraelSortCategoriesService,
    IsraelCategoryGradesService,
  ],
})
export class IsraelModule {}
