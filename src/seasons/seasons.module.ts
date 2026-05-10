import { Module } from '@nestjs/common';
import { SeasonsService } from './seasons.service';
import { SeasonsController } from './seasons.controller';
import { SystemConfigModule } from '../system-config/system-config.module';

@Module({
  imports: [SystemConfigModule],
  providers: [SeasonsService],
  controllers: [SeasonsController],
  exports: [SeasonsService],
})
export class SeasonsModule {}
