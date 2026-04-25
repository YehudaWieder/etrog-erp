// src/system-config/controllers/config/config.controller.ts

import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { SystemConfigService } from 'src/system-config/services/config/config.service';
import { Currency } from '@prisma/client';
import {
  PricingConfigSwaggerDto,
  SystemConfigCreateSwaggerDto,
  SystemConfigUpdateSwaggerDto,
} from 'src/docs/dto/swagger-enums.dto';

@ApiTags('System Configuration')
@ApiBearerAuth('access-token')
@Controller('system-config')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get(':seasonId')
  @ApiOperation({ summary: 'Retrieve the system configuration for a specific season' })
  @ApiParam({ name: 'seasonId', type: Number, description: 'The ID of the season.' })
  @ApiResponse({ status: 200, description: 'System configuration returned successfully.' })
  @ApiResponse({ status: 404, description: 'Configuration not found for the given season.' })
  getConfig(@Param('seasonId') seasonId: string) {
    return this.systemConfigService.getConfig(Number(seasonId));
  }

  @Post()
  @ApiOperation({ summary: 'Create or retrieve the system configuration for a given season' })
  @ApiBody({
    type: SystemConfigCreateSwaggerDto,
    examples: {
      minimal: {
        summary: 'Create or get config with minimum required payload',
        value: {
          seasonId: 1,
        },
      },
      full: {
        summary: 'Create config with initial pricing values',
        value: {
          seasonId: 1,
          currency: 'ILS',
          unitPrice: 8.5,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'System configuration created or retrieved successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  createConfig(@Body() body: { seasonId: number; currency?: Currency; unitPrice?: number }) {
    return this.systemConfigService.getOrCreateConfig(body.seasonId, {
      currency: body.currency,
      unitPrice: body.unitPrice,
    });
  }

  @Patch(':seasonId/pricing')
  @ApiOperation({ summary: 'Update only the pricing settings (currency and unit price) for a season\'s configuration' })
  @ApiParam({ name: 'seasonId', type: Number, description: 'The ID of the season.' })
  @ApiBody({ type: PricingConfigSwaggerDto })
  @ApiResponse({ status: 200, description: 'Pricing updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid currency or unit price.' })
  @ApiResponse({ status: 404, description: 'Configuration not found for the given season.' })
  updatePricing(
    @Param('seasonId') seasonId: string,
    @Body() body: { currency: Currency; unitPrice: number },
  ) {
    return this.systemConfigService.updatePricing(Number(seasonId), body.currency, body.unitPrice);
  }

  @Patch(':seasonId')
  @ApiOperation({ summary: 'Update general system configuration fields for a season' })
  @ApiParam({ name: 'seasonId', type: Number, description: 'The ID of the season.' })
  @ApiBody({
    type: SystemConfigUpdateSwaggerDto,
    examples: {
      full: {
        summary: 'Update both currency and unit price',
        value: {
          currency: 'USD',
          unitPrice: 10.25,
        },
      },
      partial: {
        summary: 'Update only currency',
        value: {
          currency: 'EUR',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Configuration updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Configuration not found for the given season.' })
  updateConfig(@Param('seasonId') seasonId: string, @Body() body: any) {
    return this.systemConfigService.updateConfig(Number(seasonId), body);
  }
}