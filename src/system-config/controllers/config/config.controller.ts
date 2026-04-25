// src/system-config/controllers/config/config.controller.ts

import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { SystemConfigService } from 'src/system-config/services/config/config.service';
import { Currency } from '@prisma/client';
import { PricingConfigSwaggerDto } from 'src/docs/dto/swagger-enums.dto';

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
    schema: {
      type: 'object',
      required: ['seasonId'],
      properties: {
        seasonId: { type: 'integer', description: 'The ID of the season to create or retrieve config for.' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'System configuration created or retrieved successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  createConfig(@Body() body: { seasonId: number }) {
    return this.systemConfigService.getOrCreateConfig(body.seasonId);
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
    schema: {
      type: 'object',
      properties: {
        fields: {
          type: 'array',
          items: { type: 'string' },
          example: ['North Orchard', 'South Orchard'],
        },
        currency: {
          type: 'string',
          enum: ['ILS', 'USD', 'EUR'],
          example: 'ILS',
        },
        unitPrice: {
          type: 'number',
          example: 8.5,
        },
      },
      example: {
        fields: ['North Orchard', 'South Orchard'],
        currency: 'ILS',
        unitPrice: 8.5,
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