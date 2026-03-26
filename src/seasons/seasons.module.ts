import { Module } from '@nestjs/common';
import { SeasonsService } from './seasons.service';
import { SeasonsController } from './seasons.controller';
import { SeasonsService } from './services/seasons/seasons.service';
import { ConfigService } from './services/config/config.service';
import { SeasonsController } from './controllers/seasons/seasons.controller';
import { ConfigController } from './controllers/config/config.controller';

@Module({
  providers: [SeasonsService, ConfigService],
  controllers: [SeasonsController, ConfigController]
})
export class SeasonsModule {}
