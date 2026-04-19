// src/categories/controllers/traders-cat-share/traders-cat-share.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { TraderCatShareService } from 'src/categories/services/traders-cat-share/traders-cat-share.service';
import { Prisma } from '@prisma/client';

@Controller('trader-shares')
export class TraderCatShareController {
  constructor(private readonly shareService: TraderCatShareService) {}

  @Post()
  setShare(@Body() data: { seasonId: number; traderId: number; traderCategoryId: number; percent: number }) {
    return this.shareService.setShare(data);
  }

  @Get()
  findAll(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.shareService.findAllBySeason(seasonId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.shareService.findOne(id);
  }

  @Get('by-trader-category')
  findByTraderAndCategory(
    @Query('traderId', ParseIntPipe) traderId: number,
    @Query('traderCategoryId', ParseIntPipe) traderCategoryId: number,
    @Query('seasonId', ParseIntPipe) seasonId: number,
  ) {
    return this.shareService.findByTraderAndCategory(traderId, traderCategoryId, seasonId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Prisma.TraderCategoryShareUpdateInput,
  ) {
    return this.shareService.update(id, updateData);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.shareService.remove(id);
  }
}