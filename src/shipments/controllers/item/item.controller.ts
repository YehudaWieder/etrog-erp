// src/shipments/controllers/item/item.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ItemService } from '../../services/item/item.service';
import { Prisma } from '@prisma/client';
import { CreateShipmentItemDto } from '../../services/item/dto/create-shipment-item.dto';
import { UpdateShipmentItemDto } from '../../services/item/dto/update-shipment-item.dto';

@ApiTags('Logistics')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Controller('shipment-items')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new shipment item inside a box and trigger totals recalculation for the box and shipment. Unique constraint: [seasonId, boxId, traderCategoryId, customerCategoryId, grade, pitamStatus, ownershipType, traderId, customerId].' })
  @ApiBody({
    type: CreateShipmentItemDto,
    examples: {
      sample: {
        summary: 'Sample shipment item create payload',
        value: {
          boxId: 42,
          traderCategoryId: 2,
          grade: 'א',
          pitamStatus: 'WITH_PITAM',
          quantity: 30,
          ownershipType: 'TRADER',
          traderId: 3,
          notes: 'Top quality batch',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Shipment item created successfully.', type: CreateShipmentItemDto })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate item for this box combination.' })
  create(@Body() data: CreateShipmentItemDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.itemService.create(data as Prisma.ShipmentItemUncheckedCreateInput, actor.id);
  }

  @Get('box/:boxId')
  @ApiOperation({ summary: 'Retrieve all active (non-deleted) items in a specific box, including trader and customer details' })
  @ApiParam({ name: 'boxId', type: Number, description: 'The ID of the box to retrieve items from.' })
  @ApiResponse({ status: 200, description: 'List of shipment items returned successfully.' })
  @ApiResponse({ status: 404, description: 'Box not found.' })
  findByBox(@Param('boxId', ParseIntPipe) boxId: number) {
    return this.itemService.findByBox(boxId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update a shipment item and recalculate totals for the associated box and shipment' })
  @ApiBody({
    type: UpdateShipmentItemDto,
    examples: {
      sample: {
        summary: 'Sample shipment item update payload',
        value: {
          id: 1,
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
    @Body() updateData: UpdateShipmentItemDto,
    @Req() req: Request,
  ) {
    const { id, ...data } = updateData;
    const actor = req.user as AuthenticatedUser;
    return this.itemService.update(id, data as Prisma.ShipmentItemUncheckedUpdateInput, actor.id);
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
