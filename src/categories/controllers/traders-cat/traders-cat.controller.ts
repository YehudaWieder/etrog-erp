// src/categories/controllers/traders-cat/traders-cat.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { TradersCatService } from '../../services/traders-cat/traders-cat.service';
import { Prisma } from '@prisma/client';

@Controller('traders-categories')
export class TradersCatController {
  constructor(private readonly tradersCatService: TradersCatService) {}

  @Post()
  create(
    @Body('seasonId', ParseIntPipe) seasonId: number,
    @Body('name') name: string,
    @Body('notes') notes?: string,
  ) {
    return this.tradersCatService.create(seasonId, name, notes);
  }

  @Get()
  findAll(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.tradersCatService.findAllBySeason(seasonId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tradersCatService.findOne(id);
  }

  @Get('by-name')
  findByName(
    @Query('name') name: string,
    @Query('seasonId', ParseIntPipe) seasonId: number,
  ) {
    return this.tradersCatService.findByName(name, seasonId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Prisma.TradersCategoriesUpdateInput,
  ) {
    return this.tradersCatService.update(id, updateData);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tradersCatService.remove(id);
  }
}