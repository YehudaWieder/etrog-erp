// src/seasons/seasons.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { SeasonsService } from './seasons.service';

@Controller('seasons')
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Post()
  create(@Body('yearName', ParseIntPipe) yearName: number) {
    return this.seasonsService.createSeason(yearName);
  }

  @Get()
  findAll() {
    return this.seasonsService.findAll();
  }

  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string) {
    // Handle both ID (number) and Slug (string)
    const id = parseInt(idOrSlug);
    return this.seasonsService.findOne(isNaN(id) ? idOrSlug : id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateData: any) {
    return this.seasonsService.updateSeason(id, updateData);
  }

  @Patch(':id/set-active')
  setActive(@Param('id', ParseIntPipe) id: number) {
    return this.seasonsService.setActiveSeason(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.seasonsService.remove(id);
  }
}