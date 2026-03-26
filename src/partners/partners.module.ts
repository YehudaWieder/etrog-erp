import { Module } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { PartnersController } from './partners.controller';
import { TradersService } from './services/traders/traders.service';
import { CustomersService } from './services/customers/customers.service';
import { TradersController } from './controllers/traders/traders.controller';
import { CustomersController } from './controllers/customers/customers.controller';

@Module({
  providers: [PartnersService, TradersService, CustomersService],
  controllers: [PartnersController, TradersController, CustomersController]
})
export class PartnersModule {}
