// src/categories/controllers/traders-cat-share/traders-cat-share.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { TraderCatShareService } from 'src/categories/services/traders-cat-share/traders-cat-share.service';
import { Prisma } from '@prisma/client';

@ApiTags('Categories')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Controller('trader-shares')
export class TraderCatShareController {
  constructor(private readonly shareService: TraderCatShareService) {}

  @Post()
  @ApiOperation({ summary: 'Set or upsert a trader\'s percentage share for a category within a season. Unique constraint: [traderId, traderCategoryId, seasonId].' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['seasonId', 'traderId', 'traderCategoryId', 'percent'],
      properties: {
        seasonId: { type: 'integer', example: 1 },
        traderId: { type: 'integer', example: 3 },
        traderCategoryId: { type: 'integer', example: 2 },
        percent: { type: 'number', example: 35.5 },
      },
      example: {
        seasonId: 1,
        traderId: 3,
        traderCategoryId: 2,
        percent: 35.5,
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Trader category share created or updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  setShare(@Body() data: { seasonId: number; traderId: number; traderCategoryId: number; percent: number }) {
    return this.shareService.setShare(data);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all trader category shares for a specific season' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season to filter shares by.' })
  @ApiResponse({ status: 200, description: 'List of trader category shares returned successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing seasonId query parameter.' })
  findAll(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.shareService.findAllBySeason(seasonId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single trader category share by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the share record.' })
  @ApiResponse({ status: 200, description: 'Trader category share returned successfully.' })
  @ApiResponse({ status: 404, description: 'Share record not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.shareService.findOne(id);
  }

  @Get('by-trader-category')
  @ApiOperation({ summary: 'Retrieve share record by trader, category, and season (composite key lookup)' })
  @ApiQuery({ name: 'traderId', type: Number, description: 'The ID of the trader.' })
  @ApiQuery({ name: 'traderCategoryId', type: Number, description: 'The ID of the trader category.' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season.' })
  @ApiResponse({ status: 200, description: 'Matching share record returned.' })
  @ApiResponse({ status: 404, description: 'No share found for the given combination.' })
  findByTraderAndCategory(
    @Query('traderId', ParseIntPipe) traderId: number,
    @Query('traderCategoryId', ParseIntPipe) traderCategoryId: number,
    @Query('seasonId', ParseIntPipe) seasonId: number,
  ) {
    return this.shareService.findByTraderAndCategory(traderId, traderCategoryId, seasonId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a trader category share record by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the share record to update.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        percent: { type: 'number', example: 42 },
      },
      example: {
        percent: 42,
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Share record updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Share record not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Prisma.TraderCategoryShareUpdateInput,
  ) {
    return this.shareService.update(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a trader category share record by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the share record to delete.' })
  @ApiResponse({ status: 200, description: 'Share record deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Share record not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.shareService.remove(id);
  }
}
