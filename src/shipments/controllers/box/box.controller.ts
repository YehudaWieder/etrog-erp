// src/shipments/controllers/box/box.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { BoxService } from '../../services/box/box.service';
import { Prisma } from '@prisma/client';
import { BoxSwaggerDto } from 'src/docs/dto/swagger-enums.dto';

@ApiTags('Logistics')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Controller('boxes')
export class BoxController {
  constructor(private readonly boxService: BoxService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new box within a shipment. Unique constraint: [seasonId, shipmentId, boxNumber].' })
  @ApiBody({
    type: BoxSwaggerDto,
    examples: {
      sample: {
        summary: 'Sample box create payload',
        value: {
          shipmentId: 15,
          seasonId: 1,
          boxNumber: 3,
          boxType: 'MEDIUM',
          status: 'OPEN',
          ownershipType: 'TRADER',
          traderId: 3,
          updatedById: 1,
          notes: 'Dedicated box for trader 3',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Box created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate box number in this shipment.' })
  create(@Body() data: Prisma.BoxUncheckedCreateInput) {
    return this.boxService.create(data);
  }

  @Get('shipment/:shipmentId')
  @ApiOperation({ summary: 'Retrieve all boxes belonging to a specific shipment' })
  @ApiParam({ name: 'shipmentId', type: Number, description: 'The ID of the shipment.' })
  @ApiResponse({ status: 200, description: 'List of boxes returned successfully.' })
  @ApiResponse({ status: 404, description: 'Shipment not found.' })
  findByShipment(@Param('shipmentId', ParseIntPipe) shipmentId: number) {
    return this.boxService.findByShipment(shipmentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single box by ID, including its items' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the box.' })
  @ApiResponse({ status: 200, description: 'Box returned successfully.' })
  @ApiResponse({ status: 404, description: 'Box not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.boxService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update box details (type, status, ownership, notes) by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the box to update.' })
  @ApiBody({
    type: BoxSwaggerDto,
    examples: {
      sample: {
        summary: 'Sample box update payload',
        value: {
          status: 'CLOSED',
          notes: 'Sealed and ready for dispatch',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Box updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Box not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Prisma.BoxUncheckedUpdateInput,
  ) {
    return this.boxService.update(id, updateData);
  }

  @Patch(':id/recalculate')
  @ApiOperation({ summary: 'Recalculate and update the total quantity for a box based on its items' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the box to recalculate.' })
  @ApiResponse({ status: 200, description: 'Box total recalculated successfully.' })
  @ApiResponse({ status: 404, description: 'Box not found.' })
  recalculate(@Param('id', ParseIntPipe) id: number) {
    return this.boxService.updateBoxTotal(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a box by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the box to delete.' })
  @ApiResponse({ status: 200, description: 'Box deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Box not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.boxService.remove(id);
  }
}
