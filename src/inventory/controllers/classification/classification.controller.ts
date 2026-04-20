// src/inventory/controllers/classification/classification.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ClassificationService } from '../../services/classification/classification.service';
import { Prisma } from '@prisma/client';

@Controller('classifications')
export class ClassificationController {
  constructor(private readonly classificationService: ClassificationService) {}

  @Post()
  create(@Body() data: Prisma.ClassificationUncheckedCreateInput) {
    return this.classificationService.create(data);
  }

  @Get('harvest/:harvestId')
  findByHarvest(@Param('harvestId', ParseIntPipe) harvestId: number) {
    return this.classificationService.findByHarvest(harvestId);
  }

  @Get()
  findAll(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.classificationService.findAllBySeason(seasonId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Prisma.ClassificationUncheckedUpdateInput,
  ) {
    return this.classificationService.update(id, updateData);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.classificationService.remove(id);
  }
}