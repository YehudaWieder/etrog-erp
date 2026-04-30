// src/inventory/controllers/trader-stock/trader-stock.controller.ts

import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe, Query, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { TraderStockService } from '../../services/trader-stock/trader-stock.service';
import { Prisma, Grade, PitamStatus } from '@prisma/client';
import { TraderStockSwaggerDto } from 'src/docs/dto/swagger-enums.dto';

@ApiTags('Inventory')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Controller('trader-stock')
export class TraderStockController {
  constructor(private readonly stockService: TraderStockService) {}

  @Post('movement')
  @ApiOperation({ summary: 'Record a new trader stock movement (e.g., HARVEST_IN, PACKED_SHIPPED, WASTE)' })
  @ApiBody({
    type: TraderStockSwaggerDto,
    examples: {
      sample: {
        summary: 'Sample trader stock movement payload',
        value: {
          seasonId: 1,
          date: '2026-10-08T08:30:00.000Z',
          traderId: 3,
          traderCategoryId: 2,
          grade: 'ב',
          pitamStatus: 'WITH_PITAM',
          quantity: 200,
          type: 'HARVEST_IN',
          updatedById: 1,
          notes: 'Inbound from sorting line',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Stock movement recorded successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid movement data.' })
  create(@Body() data: Prisma.TraderStockUncheckedCreateInput) {
    return this.stockService.createMovement(data);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get the net stock balance for a trader category filtered by grade and pitam status' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season.' })
  @ApiQuery({ name: 'traderCategoryId', type: Number, description: 'The ID of the trader category.' })
  @ApiQuery({ name: 'grade', enum: Grade, enumName: 'Grade', description: 'The etrog grade to filter by.' })
  @ApiQuery({ name: 'pitamStatus', enum: PitamStatus, enumName: 'PitamStatus', description: 'The pitam status to filter by.' })
  @ApiQuery({ name: 'traderId', type: Number, required: false, description: 'Optional trader ID. Omit for Modulo (general pool) balance.' })
  @ApiResponse({ status: 200, description: 'Current stock balance returned.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing query parameters.' })
  getBalance(
    @Query('seasonId', ParseIntPipe) seasonId: number,
    @Query('traderCategoryId', ParseIntPipe) traderCategoryId: number,
    @Query('grade') grade: any,
    @Query('pitamStatus') pitamStatus: any,
    @Query('traderId') traderId?: string,
  ) {
    return this.stockService.getBalance({
      seasonId,
      traderCategoryId,
      grade,
      pitamStatus,
      traderId: traderId ? parseInt(traderId) : undefined,
    });
  }

  @Get('history')
  @ApiOperation({ summary: 'Retrieve the full movement history for a trader within a specific category and season' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season.' })
  @ApiQuery({ name: 'traderId', type: Number, description: 'The ID of the trader.' })
  @ApiQuery({ name: 'traderCategoryId', type: Number, description: 'The ID of the trader category.' })
  @ApiResponse({ status: 200, description: 'Movement history returned successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing query parameters.' })
  getHistory(
    @Query('seasonId', ParseIntPipe) seasonId: number,
    @Query('traderId', ParseIntPipe) traderId: number,
    @Query('traderCategoryId', ParseIntPipe) traderCategoryId: number,
  ) {
    return this.stockService.getMovementHistory(seasonId, traderId, traderCategoryId);
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Retrieve the full stock ledger for a trader across all categories in a season' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season.' })
  @ApiQuery({ name: 'traderId', type: Number, description: 'The ID of the trader.' })
  @ApiResponse({ status: 200, description: 'Trader ledger returned successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing query parameters.' })
  getLedger(
    @Query('seasonId', ParseIntPipe) seasonId: number,
    @Query('traderId', ParseIntPipe) traderId: number,
  ) {
    return this.stockService.getLedger(seasonId, traderId);
  }

  @Get('reference/:referenceId')
  @ApiOperation({ summary: 'Find stock movements linked to a specific reference (classification, shipment item, or allocation) by reference ID' })
  @ApiParam({ name: 'referenceId', type: Number, description: 'The MovementReferenceId to look up.' })
  @ApiResponse({ status: 200, description: 'Matching stock movements returned.' })
  @ApiResponse({ status: 404, description: 'No movements found for the given reference ID.' })
  findByReference(@Param('referenceId', ParseIntPipe) referenceId: number) {
    return this.stockService.findByReference(referenceId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a stock movement record by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the stock movement to delete.' })
  @ApiResponse({ status: 200, description: 'Stock movement deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Stock movement not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.remove(id);
  }

  @Post('adjustments')
  @ApiOperation({ summary: 'Create trader WASTE/ADJUSTMENT/SELF_PICKUP movement (same endpoint, different type).' })
  @ApiBody({ type: TraderStockSwaggerDto })
  @ApiResponse({ status: 201, description: 'Trader adjustment movement created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid adjustment payload.' })
  createAdjustment(@Body() data: Prisma.TraderStockUncheckedCreateInput) {
    return this.stockService.createAdjustment(data);
  }

  @Patch('adjustments/:id')
  @ApiOperation({ summary: 'Update trader WASTE/ADJUSTMENT/SELF_PICKUP movement.' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: TraderStockSwaggerDto })
  @ApiResponse({ status: 200, description: 'Trader adjustment movement updated successfully.' })
  @ApiResponse({ status: 404, description: 'Trader adjustment movement not found.' })
  updateAdjustment(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Prisma.TraderStockUncheckedUpdateInput,
  ) {
    return this.stockService.updateAdjustment(id, data);
  }

  @Delete('adjustments/:id')
  @ApiOperation({ summary: 'Soft delete trader WASTE/ADJUSTMENT/SELF_PICKUP movement.' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Trader adjustment movement deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Trader adjustment movement not found.' })
  removeAdjustment(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.removeAdjustment(id);
  }
}
