// src/shipments/controllers/item/item.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ItemService } from '../../services/item/item.service';
import { Prisma } from '@prisma/client';

@Controller('shipment-items')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  // Creates a shipment item and triggers totals recalculation for Box and Shipment.
  @Post()
  create(@Body() data: Prisma.ShipmentItemUncheckedCreateInput) {
    return this.itemService.create(data);
  }

  // Retrieves all items for a given box, excluding soft-deleted items, and includes related trader and customer info.
  @Get('box/:boxId')
  findByBox(@Param('boxId', ParseIntPipe) boxId: number) {
    return this.itemService.findByBox(boxId);
  }

  // Updates an item and ensures totals are recalculated for the associated Box and Shipment.
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Prisma.ShipmentItemUncheckedUpdateInput,
  ) {
    return this.itemService.update(id, updateData);
  }

  // Soft deletes an item and updates totals accordingly.
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.itemService.remove(id);
  }
}