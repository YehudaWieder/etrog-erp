import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { SeasonsModule } from './seasons/seasons.module';
import { PartnersModule } from './partners/partners.module';
import { HarvestModule } from './harvest/harvest.module';
import { InventoryModule } from './inventory/inventory.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { MessagesModule } from './messages/messages.module';
import { CategoriesModule } from './categories/categories.module';
import { PrismaModule } from './prisma/prisma.module';
import { SystemConfigModule } from './system-config/system-config.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AuthorizationModule } from './authorization/authorization.module';
import { RolesGuard } from './authorization/guards/roles.guard';
import { ActiveGuard } from './authorization/guards/active.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    UsersModule,
    SeasonsModule,
    PartnersModule,
    HarvestModule,
    InventoryModule,
    ShipmentsModule,
    MessagesModule,
    CategoriesModule,
    PrismaModule,
    SystemConfigModule,
    AuthModule,
    AuthorizationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ActiveGuard,
    },
  ],
})
export class AppModule {}
