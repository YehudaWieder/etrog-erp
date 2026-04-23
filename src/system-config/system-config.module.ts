// src/system-config/system-config.module.ts
import { Module } from '@nestjs/common';
import { SystemConfigService } from './services/config/config.service';
import { SystemConfigController } from './controllers/config/config.controller';
import { FieldService } from './services/fields/fields.service';
import { FieldController } from './controllers/fields/fields.controller';
import { ConfigService } from './system-config.service';
import { ConfigController } from './system-config.controller';

@Module({
  controllers: [SystemConfigController, FieldController, ConfigController],
  providers: [SystemConfigService, ConfigService, FieldService],
})
export class SystemConfigModule {}