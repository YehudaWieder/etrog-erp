// src/inventory/controllers/trader-stock/trader-stock.controller.ts

import { Controller, Get, Post, Delete, Body, Param, ParseEnumPipe, ParseIntPipe, Query, Patch, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { TraderStockService } from '../../services/trader-stock/trader-stock.service';
import { InventoryOwnerScope, InventoryShipmentScope, InventorySortBy, InventorySourceScope } from '../../services/trader-stock/dto/inventory-summary.dto';
import { Prisma, Grade, PitamStatus } from '@prisma/client';
import { CreateTraderStockMovementDto } from '../../services/trader-stock/dto/create-trader-stock-movement.dto';
import { UpdateTraderStockAdjustmentDto } from '../../services/trader-stock/dto/update-trader-stock-adjustment.dto';
import { buildTraderStockSummaryQuery } from '../../services/trader-stock/utils/trader-stock-query-parse.util';
import { parseOptionalInt } from 'src/inventory/services/inventory-core/utils/inventory-query-parse.util';

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
    schema: {
      type: 'object',
      required: ['date', 'traderCategoryId', 'grade', 'pitamStatus', 'quantity', 'type'],
      properties: {
        date: { type: 'string', format: 'date-time', example: '2026-10-08T08:30:00.000Z' },
        traderId: { type: 'number', example: 3, nullable: true },
        traderCategoryId: { type: 'number', example: 2 },
        grade: { type: 'string', enum: Object.values(Grade) },
        pitamStatus: { type: 'string', enum: Object.values(PitamStatus) },
        quantity: { type: 'number', example: 200 },
        isModulo: { type: 'boolean', example: false },
        type: {
          type: 'string',
          enum: ['HARVEST_IN', 'PACKED_SHIPPED', 'SELF_PICKUP', 'WASTE', 'ADJUSTMENT', 'INTERNAL_TRANSFER', 'OWNERSHIP_TRANSFER', 'ASSIGNED'],
        },
        notes: { type: 'string', example: 'Inbound from sorting line', nullable: true },
      },
    },
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
          notes: 'Inbound from sorting line',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Stock movement recorded successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid movement data.' })
  create(@Body() data: CreateTraderStockMovementDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.stockService.createMovement(data as Prisma.TraderStockUncheckedCreateInput, actor.id);
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
    @Query('grade', new ParseEnumPipe(Grade)) grade: Grade,
    @Query('pitamStatus', new ParseEnumPipe(PitamStatus)) pitamStatus: PitamStatus,
    @Query('traderId') traderId?: string,
  ) {
    return this.stockService.getBalance({
      seasonId,
      traderCategoryId,
      grade,
      pitamStatus,
      traderId: parseOptionalInt(traderId),
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

  @Get('summary')
  @ApiOperation({
    summary:
      'Get aggregated inventory summary for all traders, a specific trader, or modulo, with shipped/unshipped filters and sorting.',
  })
  @ApiQuery({ name: 'seasonId', type: Number, required: false, description: 'Optional season ID. Defaults to active season.' })
  @ApiQuery({ name: 'traderId', type: Number, required: false, description: 'Filter by a specific trader ID.' })
  @ApiQuery({ name: 'ownerScope', required: false, enum: ['ALL', 'TRADER', 'MODULO'], description: 'ALL = all traders + modulo, TRADER = one trader, MODULO = unassigned stock only.' })
  @ApiQuery({ name: 'shipmentScope', required: false, enum: ['ALL', 'SHIPPED', 'UNSHIPPED', 'PACKED_SHIPPED', 'SELF_PICKUP', 'HARVEST_IN', 'INTERNAL_TRANSFER', 'TRANSFERRED_TO_CUSTOMER', 'OWNERSHIP_TRANSFER', 'ASSIGNED', 'WASTE', 'ADJUSTMENT'], description: 'Filter by movement type. Logical groups: SHIPPED = PACKED_SHIPPED + SELF_PICKUP, UNSHIPPED = all non-outbound types. Exact types: PACKED_SHIPPED, SELF_PICKUP, HARVEST_IN, INTERNAL_TRANSFER, TRANSFERRED_TO_CUSTOMER (negative INTERNAL_TRANSFER rows only, i.e. stock given to a customer), OWNERSHIP_TRANSFER, ASSIGNED, WASTE, ADJUSTMENT.' })
  @ApiQuery({ name: 'sourceScope', required: false, enum: ['ALL', 'GENERAL', 'PRIVATE_SELECTION'], description: 'Filter by stock origin, independent of shipmentScope. GENERAL excludes private-selection-pool stock, PRIVATE_SELECTION restricts to it (combines with shipmentScope).' })
  @ApiQuery({ name: 'traderCategoryId', type: Number, required: false, description: 'Optional trader category filter.' })
  @ApiQuery({ name: 'grade', enum: Grade, enumName: 'Grade', required: false, description: 'Optional grade filter.' })
  @ApiQuery({ name: 'pitamStatus', enum: PitamStatus, enumName: 'PitamStatus', required: false, description: 'Optional pitam status filter.' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['category', 'trader', 'quantity', 'grade', 'pitamStatus', 'updatedAt'], description: 'Sort field.' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort direction.' })
  @ApiResponse({ status: 200, description: 'Aggregated inventory summary returned successfully.' })
  getSummary(
    @Query('seasonId') seasonId?: string,
    @Query('traderId') traderId?: string,
    @Query('ownerScope') ownerScope?: InventoryOwnerScope,
    @Query('shipmentScope') shipmentScope?: InventoryShipmentScope,
    @Query('sourceScope') sourceScope?: InventorySourceScope,
    @Query('traderCategoryId') traderCategoryId?: string,
    @Query('grade') grade?: Grade,
    @Query('pitamStatus') pitamStatus?: PitamStatus,
    @Query('sortBy') sortBy?: InventorySortBy,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.stockService.getInventorySummary(
      buildTraderStockSummaryQuery({
        seasonId,
        traderId,
        ownerScope,
        shipmentScope,
        sourceScope,
        traderCategoryId,
        grade,
        pitamStatus,
        sortBy,
        sortOrder,
      }),
    );
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
  @ApiBody({
    schema: {
      type: 'object',
      required: ['date', 'traderCategoryId', 'grade', 'pitamStatus', 'quantity', 'type'],
      properties: {
        date: { type: 'string', format: 'date-time', example: '2026-10-11T07:30:00.000Z' },
        traderId: { type: 'number', example: 3, nullable: true },
        traderCategoryId: { type: 'number', example: 2 },
        grade: { type: 'string', enum: Object.values(Grade) },
        pitamStatus: { type: 'string', enum: Object.values(PitamStatus) },
        quantity: { type: 'number', example: 12 },
        isModulo: { type: 'boolean', example: false },
        type: { type: 'string', enum: ['WASTE', 'ADJUSTMENT', 'SELF_PICKUP'] },
        notes: { type: 'string', example: 'Damaged in storage', nullable: true },
      },
    },
    examples: {
      waste: {
        summary: 'Create WASTE adjustment',
        value: {
          date: '2026-10-11T07:30:00.000Z',
          traderId: 3,
          traderCategoryId: 2,
          grade: 'ב',
          pitamStatus: 'WITH_PITAM',
          quantity: 12,
          isModulo: false,
          type: 'WASTE',
          notes: 'Damaged in storage',
        },
      },
      selfPickup: {
        summary: 'Create SELF_PICKUP adjustment',
        value: {
          date: '2026-10-11T09:30:00.000Z',
          traderId: 9,
          traderCategoryId: 3,
          grade: 'א',
          pitamStatus: 'MIXED',
          quantity: 25,
          isModulo: false,
          type: 'SELF_PICKUP',
          notes: 'Trader collected directly',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Trader adjustment movement created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid adjustment payload.' })
  createAdjustment(@Body() data: CreateTraderStockMovementDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.stockService.createAdjustment(data as Prisma.TraderStockUncheckedCreateInput, actor.id);
  }

  @Patch('adjustments')
  @ApiOperation({ summary: 'Update trader WASTE/ADJUSTMENT/SELF_PICKUP movement.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'number', example: 1 },
        quantity: { type: 'number', example: 10 },
        notes: { type: 'string', example: 'Updated after recount', nullable: true },
      },
    },
    examples: {
      update: {
        summary: 'Update trader adjustment payload',
        value: {
          id: 1,
          quantity: 10,
          notes: 'Updated after recount',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Trader adjustment movement updated successfully.' })
  @ApiResponse({ status: 404, description: 'Trader adjustment movement not found.' })
  updateAdjustment(
    @Body() data: UpdateTraderStockAdjustmentDto,
    @Req() req: Request,
  ) {
    const actor = req.user as AuthenticatedUser;
    const { id, ...updateData } = data;
    return this.stockService.updateAdjustment(id, updateData as Prisma.TraderStockUncheckedUpdateInput, actor.id);
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
