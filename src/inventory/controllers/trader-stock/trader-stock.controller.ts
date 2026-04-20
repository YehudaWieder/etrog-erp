// src/inventory/controllers/trader-stock/trader-stock.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { TraderStockService } from '../../services/trader-stock/trader-stock.service';
import { Prisma } from '@prisma/client';

@Controller('trader-stock')
export class TraderStockController {
  constructor(private readonly stockService: TraderStockService) {}

  @Post('movement')
  create(@Body() data: Prisma.TraderStockUncheckedCreateInput) {
    return this.stockService.createMovement(data);
  }

  @Get('balance')
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
  getHistory(
    @Query('seasonId', ParseIntPipe) seasonId: number,
    @Query('traderId', ParseIntPipe) traderId: number,
    @Query('traderCategoryId', ParseIntPipe) traderCategoryId: number,
  ) {
    return this.stockService.getMovementHistory(seasonId, traderId, traderCategoryId);
  }

  @Get('ledger')
  getLedger(
    @Query('seasonId', ParseIntPipe) seasonId: number,
    @Query('traderId', ParseIntPipe) traderId: number,
  ) {
    return this.stockService.getLedger(seasonId, traderId);
  }

  @Get('reference/:referenceId')
  findByReference(@Param('referenceId', ParseIntPipe) referenceId: number) {
    return this.stockService.findByReference(referenceId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.remove(id);
  }
}