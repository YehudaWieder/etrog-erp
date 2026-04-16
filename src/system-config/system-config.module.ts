// src/system-config/system-config.module.ts
import { Module } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { SystemConfigController } from 'src/system-config/system-config.controller';

@Module({
  controllers: [SystemConfigController],
  providers: [SystemConfigService],
})
export class SystemConfigModule {}