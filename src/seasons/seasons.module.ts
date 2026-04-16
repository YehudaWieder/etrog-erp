import { Module } from '@nestjs/common';
import { SeasonsService } from './seasons.service';
import { SystemConfigService } from 'src/system-config/system-config.service';
import { SeasonsController } from './seasons.controller';
import { SystemConfigController } from 'src/system-config/system-config.controller';

@Module({
  providers: [SeasonsService, SystemConfigService],
  controllers: [SeasonsController, SystemConfigController]
})
export class SeasonsModule {}
