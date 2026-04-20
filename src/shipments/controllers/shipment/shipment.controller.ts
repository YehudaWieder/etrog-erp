// src/shipments/controllers/shipment/shipment.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ShipmentService } from '../../services/shipment/shipment.service';
import { Prisma } from '@prisma/client';

@Controller('shipments')
export class ShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  @Post()
  create(@Body() data: Prisma.ShipmentUncheckedCreateInput) {
    return this.shipmentService.create(data);
  }

  @Get()
  findAll(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.shipmentService.findAllBySeason(seasonId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.shipmentService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Prisma.ShipmentUncheckedUpdateInput,
  ) {
    return this.shipmentService.update(id, updateData);
  }

  @Patch(':id/recalculate')
  recalculate(@Param('id', ParseIntPipe) id: number) {
    return this.shipmentService.updateTotals(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.shipmentService.remove(id);
  }
}