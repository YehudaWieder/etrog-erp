// src/system-config/system-config.module.ts
import { Module } from '@nestjs/common';
import { SystemConfigService } from './services/config/config.service';
import { SystemConfigController } from './controllers/config/config.controller';
import { FieldService } from './services/fields/fields.service';
import { FieldController } from './controllers/fields/fields.controller';
import { SeedService } from './services/seed/seed.service';
import { DefaultTraderCategoryService } from './services/default-trader-category/default-trader-category.service';
import { DefaultTraderCategoryController } from './controllers/default-trader-category/default-trader-category.controller';

@Module({
  controllers: [
    SystemConfigController,
    FieldController,
    DefaultTraderCategoryController,
  ],
  providers: [
    SystemConfigService,
    FieldService,
    SeedService,
    DefaultTraderCategoryService,
  ],
  exports: [SeedService, DefaultTraderCategoryService],
})
export class SystemConfigModule {}