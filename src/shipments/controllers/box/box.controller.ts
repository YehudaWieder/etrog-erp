// src/shipments/controllers/box/box.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { BoxService } from '../../services/box/box.service';
import { Prisma } from '@prisma/client';

@Controller('boxes')
export class BoxController {
  constructor(private readonly boxService: BoxService) {}

  @Post()
  create(@Body() data: Prisma.BoxUncheckedCreateInput) {
    return this.boxService.create(data);
  }

  @Get('shipment/:shipmentId')
  findByShipment(@Param('shipmentId', ParseIntPipe) shipmentId: number) {
    return this.boxService.findByShipment(shipmentId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.boxService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Prisma.BoxUncheckedUpdateInput,
  ) {
    return this.boxService.update(id, updateData);
  }

  @Patch(':id/recalculate')
  recalculate(@Param('id', ParseIntPipe) id: number) {
    return this.boxService.updateBoxTotal(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.boxService.remove(id);
  }
}