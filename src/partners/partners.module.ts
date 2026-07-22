import { Module } from '@nestjs/common';
import { TradersService } from './services/traders/traders.service';
import { CustomersService } from './services/customers/customers.service';
import { TraderSeasonSettingsService } from './services/trader-season-settings/trader-season-settings.service';
import { TradersController } from './controllers/traders/traders.controller';
import { CustomersController } from './controllers/customers/customers.controller';
import { TraderSeasonSettingsController } from './controllers/trader-season-settings/trader-season-settings.controller';
import { SeasonsModule } from '../seasons/seasons.module';

@Module({
  imports: [SeasonsModule],
  providers: [TradersService, CustomersService, TraderSeasonSettingsService],
  controllers: [TradersController, CustomersController, TraderSeasonSettingsController],
})
export class PartnersModule {}
