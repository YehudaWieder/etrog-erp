import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { SeasonsModule } from './seasons/seasons.module';
import { PartnersModule } from './partners/partners.module';
import { HarvestModule } from './harvest/harvest.module';
import { InventoryModule } from './inventory/inventory.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { MessagesModule } from './messages/messages.module';
import { CategoriesModule } from './categories/categories.module';

@Module({
  imports: [UsersModule, SeasonsModule, PartnersModule, HarvestModule, InventoryModule, ShipmentsModule, MessagesModule, CategoriesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
