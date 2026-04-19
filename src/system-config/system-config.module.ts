// src/system-config/system-config.module.ts
import { Module } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { SystemConfigController } from 'src/system-config/system-config.controller';
import { ConfigService } from './services/config/config.service';
import { FieldsService } from './services/fields/fields.service';
import { FieldsController } from './controllers/fields/fields.controller';
import { ConfigController } from './controllers/config/config.controller';

@Module({
  controllers: [SystemConfigController, FieldsController, ConfigController],
  providers: [SystemConfigService, ConfigService, FieldsService],
})
export class SystemConfigModule {}