// src/partners/controllers/trader-season-settings/trader-season-settings.controller.ts

import { Controller, Get, Post, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { TraderSeasonSettingsService } from 'src/partners/services/trader-season-settings/trader-season-settings.service';
import { Currency, Role } from '@prisma/client';
import { SetTraderSeasonSettingsDto } from 'src/partners/services/trader-season-settings/dto/set-trader-season-settings.dto';
import { Roles } from 'src/authorization/decorators/roles.decorator';

@ApiTags('Partners')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Roles(Role.OWNER, Role.MANAGER)
@Controller('trader-season-settings')
export class TraderSeasonSettingsController {
  constructor(private readonly traderSeasonSettingsService: TraderSeasonSettingsService) {}

  @Post()
  @ApiOperation({ summary: "Create or update a trader's payment percent and price-per-etrog for a season. Unique constraint: [traderId, seasonId]." })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['seasonId', 'traderId', 'paymentPercent', 'pricePerEtrog'],
      properties: {
        seasonId: { type: 'number', example: 1 },
        traderId: { type: 'number', example: 5 },
        paymentPercent: { type: 'number', example: 12.5 },
        pricePerEtrog: { type: 'number', example: 3.5 },
        currency: { type: 'string', enum: Object.values(Currency), example: Currency.ILS },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Trader season settings set successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input or total payment percent for the season exceeds 100%.' })
  setForTrader(@Body() data: SetTraderSeasonSettingsDto) {
    return this.traderSeasonSettingsService.setForTrader(data);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all trader season settings for a specific season' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season.' })
  @ApiResponse({ status: 200, description: 'List of trader season settings returned successfully.' })
  findAllBySeason(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.traderSeasonSettingsService.findAllBySeason(seasonId);
  }

  @Get('by-trader')
  @ApiOperation({ summary: 'Retrieve a single trader\'s settings for a specific season' })
  @ApiQuery({ name: 'traderId', type: Number, description: 'The ID of the trader.' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season.' })
  @ApiResponse({ status: 200, description: 'Trader season settings returned successfully (null if not set).' })
  findByTrader(
    @Query('traderId', ParseIntPipe) traderId: number,
    @Query('seasonId', ParseIntPipe) seasonId: number,
  ) {
    return this.traderSeasonSettingsService.findByTrader(traderId, seasonId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a trader season settings entry by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the trader season settings entry to remove.' })
  @ApiResponse({ status: 200, description: 'Trader season settings entry removed successfully.' })
  @ApiResponse({ status: 404, description: 'Trader season settings entry not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.traderSeasonSettingsService.remove(id);
  }
}
