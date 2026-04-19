// src/system-config/controllers/config/config.controller.ts

import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { SystemConfigService } from 'src/system-config/services/config/config.service';
import { Currency } from '@prisma/client';

@Controller('system-config')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  // Get config by season
  @Get(':seasonId')
  getConfig(@Param('seasonId') seasonId: string) {
    return this.systemConfigService.getConfig(Number(seasonId));
  }

  // Create config for season
    @Post()
    createConfig(@Body() body: { seasonId: number }) {
        return this.systemConfigService.getOrCreateConfig(body.seasonId);
    }

  // Update pricing only
  @Patch(':seasonId/pricing')
  updatePricing(
    @Param('seasonId') seasonId: string,
    @Body()
    body: {
      currency: Currency;
      unitPrice: number;
    },
  ) {
    return this.systemConfigService.updatePricing(
      Number(seasonId),
      body.currency,
      body.unitPrice,
    );
  }

  // Generic update
  @Patch(':seasonId')
  updateConfig(
    @Param('seasonId') seasonId: string,
    @Body() body: any,
  ) {
    return this.systemConfigService.updateConfig(Number(seasonId), body);
  }
}