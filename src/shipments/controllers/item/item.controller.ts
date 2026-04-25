// src/shipments/controllers/item/item.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { ItemService } from '../../services/item/item.service';
import { Prisma } from '@prisma/client';
import { ShipmentItemSwaggerDto } from 'src/docs/dto/swagger-enums.dto';

@ApiTags('Logistics')
@ApiBearerAuth('access-token')
@Controller('shipment-items')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new shipment item inside a box and trigger totals recalculation for the box and shipment. Unique constraint: [seasonId, boxId, traderCategoryId, customerCategoryId, grade, pitamStatus, ownershipType, traderId, customerId].' })
  @ApiBody({
    type: ShipmentItemSwaggerDto,
    examples: {
      sample: {
        summary: 'Sample shipment item create payload',
        value: {
          shipmentId: 15,
          boxId: 42,
          seasonId: 1,
          traderCategoryId: 2,
          grade: 'א',
          pitamStatus: 'WITH_PITAM',
          quantity: 30,
          ownershipType: 'TRADER',
          traderId: 3,
          updatedById: 1,
          notes: 'Top quality batch',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Shipment item created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate item for this box combination.' })
  create(@Body() data: Prisma.ShipmentItemUncheckedCreateInput) {
    return this.itemService.create(data);
  }

  @Get('box/:boxId')
  @ApiOperation({ summary: 'Retrieve all active (non-deleted) items in a specific box, including trader and customer details' })
  @ApiParam({ name: 'boxId', type: Number, description: 'The ID of the box to retrieve items from.' })
  @ApiResponse({ status: 200, description: 'List of shipment items returned successfully.' })
  @ApiResponse({ status: 404, description: 'Box not found.' })
  findByBox(@Param('boxId', ParseIntPipe) boxId: number) {
    return this.itemService.findByBox(boxId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a shipment item and recalculate totals for the associated box and shipment' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the shipment item to update.' })
  @ApiBody({
    type: ShipmentItemSwaggerDto,
    examples: {
      sample: {
        summary: 'Sample shipment item update payload',
        value: {
          quantity: 34,
          notes: 'Adjusted after final packing review',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Shipment item updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Shipment item not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Prisma.ShipmentItemUncheckedUpdateInput,
  ) {
    return this.itemService.update(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a shipment item and update totals for the associated box and shipment' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the shipment item to delete.' })
  @ApiResponse({ status: 200, description: 'Shipment item deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Shipment item not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.itemService.remove(id);
  }
}