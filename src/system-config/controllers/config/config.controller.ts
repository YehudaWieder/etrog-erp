// src/system-config/controllers/config/config.controller.ts

import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { SystemConfigService } from 'src/system-config/services/config/config.service';
import { Currency, Role } from '@prisma/client';
import {
  PricingConfigSwaggerDto,
  SystemConfigCreateSwaggerDto,
  SystemConfigUpdateSwaggerDto,
} from 'src/docs/dto/swagger-enums.dto';
import { Roles } from 'src/authorization/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authorization/guards/roles.guard';
import { ActiveGuard } from 'src/authorization/guards/active.guard';

@ApiTags('System Configuration')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@UseGuards(JwtAuthGuard, RolesGuard, ActiveGuard)
@Roles(Role.OWNER, Role.MANAGER)
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
  @ApiOperation({ summary: 'Create or retrieve pricing configuration for a season. Roles: OWNER, MANAGER. New creation requires both currency and unitPrice.' })
  @ApiBody({
    type: SystemConfigCreateSwaggerDto,
    examples: {
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
  @ApiResponse({ status: 400, description: 'Invalid input. Creating a new config requires both pricing fields (currency and unitPrice).' })
  createConfig(@Body() body: { seasonId: number; currency: Currency; unitPrice: number }) {
    return this.systemConfigService.getOrCreateConfig(body.seasonId, {
      currency: body.currency,
      unitPrice: body.unitPrice,
    }, { requirePricingOnCreate: true });
  }

  @Patch('pricing')
  @ApiOperation({ summary: 'Update only the pricing settings (currency and unit price) for a season\'s configuration' })
  @ApiBody({ 
    type: PricingConfigSwaggerDto,
    examples: {
      sample: {
        summary: 'Update pricing for a season',
        value: {
          seasonId: 1,
          currency: 'USD',
          unitPrice: 10.5,
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Pricing updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid currency or unit price.' })
  @ApiResponse({ status: 404, description: 'Configuration not found for the given season.' })
  updatePricing(
    @Body() body: PricingConfigSwaggerDto,
  ) {
    return this.systemConfigService.updatePricing(body.seasonId, body.currency, body.unitPrice);
  }

  @Patch()
  @ApiOperation({ summary: 'Update general system configuration fields for a season' })
  @ApiBody({
    type: SystemConfigUpdateSwaggerDto,
    examples: {
      full: {
        summary: 'Update both currency and unit price',
        value: {
          seasonId: 1,
          currency: 'USD',
          unitPrice: 10.25,
        },
      },
      partial: {
        summary: 'Update only currency',
        value: {
          seasonId: 1,
          currency: 'EUR',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Configuration updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Configuration not found for the given season.' })
  updateConfig(@Body() body: SystemConfigUpdateSwaggerDto) {
    return this.systemConfigService.updateConfig(body.seasonId, body);
  }
}
