import { Module } from '@nestjs/common';
import { TradersService } from './services/traders/traders.service';
import { CustomersService } from './services/customers/customers.service';
import { TradersController } from './controllers/traders/traders.controller';
import { CustomersController } from './controllers/customers/customers.controller';

@Module({
  providers: [TradersService, CustomersService],
  controllers: [TradersController, CustomersController],
})
export class PartnersModule {}
