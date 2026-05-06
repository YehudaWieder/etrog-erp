// src/shipments/controllers/box/box.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { BoxService } from '../../services/box/box.service';
import { BoxOwnership, BoxStatus, BoxType } from '@prisma/client';
import { CreateBoxSwaggerDto, UpdateBoxSwaggerDto, BoxResponseSwaggerDto } from 'src/docs/dto/swagger-enums.dto';

type BoxCreateBody = {
  shipmentId: number;
  boxNumber: number;
  boxType: BoxType;
  updatedById: number;
  status?: BoxStatus;
  notes?: string;
  ownershipType?: BoxOwnership;
  traderId?: number;
  customerId?: number;
};

type BoxUpdateBody = {
  updatedById?: number;
  boxType?: BoxType;
  status?: BoxStatus;
  notes?: string | null;
  ownershipType?: BoxOwnership;
  traderId?: number | null;
  customerId?: number | null;
};

@ApiTags('Logistics')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Controller('boxes')
export class BoxController {
  constructor(private readonly boxService: BoxService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new box within a shipment. seasonId and totalQuantity are auto-managed by the server.' })
  @ApiBody({
    type: CreateBoxSwaggerDto,
    examples: {
      traderBox: {
        summary: 'Box owned by a trader',
        value: {
          shipmentId: 15,
          boxNumber: 3,
          boxType: 'MEDIUM',
          updatedById: 1,
          ownershipType: 'TRADER',
          traderId: 3,
          notes: 'Dedicated box for trader 3',
        },
      },
      unassignedBox: {
        summary: 'Unassigned box (minimum required fields)',
        value: {
          shipmentId: 15,
          boxNumber: 4,
          boxType: 'SMALL',
          updatedById: 1,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Box created successfully.', type: BoxResponseSwaggerDto })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate box number in this shipment.' })
  create(@Body() data: BoxCreateBody) {
    return this.boxService.create(data);
  }

  @Get('shipment/:shipmentId')
  @ApiOperation({ summary: 'Retrieve all boxes belonging to a specific shipment' })
  @ApiParam({ name: 'shipmentId', type: Number, description: 'The ID of the shipment.' })
  @ApiResponse({ status: 200, description: 'List of boxes returned successfully.', type: BoxResponseSwaggerDto, isArray: true })
  @ApiResponse({ status: 404, description: 'Shipment not found.' })
  findByShipment(@Param('shipmentId', ParseIntPipe) shipmentId: number) {
    return this.boxService.findByShipment(shipmentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single box by ID, including its items' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the box.' })
  @ApiResponse({ status: 200, description: 'Box returned successfully.', type: BoxResponseSwaggerDto })
  @ApiResponse({ status: 404, description: 'Box not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.boxService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update box details by ID. Editable fields: updatedById, boxType, status, notes, ownershipType, traderId, customerId.' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the box to update.' })
  @ApiBody({
    type: UpdateBoxSwaggerDto,
    examples: {
      closeBox: {
        summary: 'Close a box',
        value: {
          updatedById: 1,
          status: 'CLOSED',
          notes: 'Sealed and ready for dispatch',
        },
      },
      assignToCustomer: {
        summary: 'Reassign ownership to a customer',
        value: {
          updatedById: 1,
          ownershipType: 'CUSTOMER',
          customerId: 7,
          traderId: null,
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Box updated successfully.', type: BoxResponseSwaggerDto })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Box not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: BoxUpdateBody,
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
  @ApiOperation({ summary: 'Permanently delete a box and all its items. This action is irreversible.' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the box to permanently delete.' })
  @ApiResponse({ status: 200, description: 'Box and all its items permanently deleted.' })
  @ApiResponse({ status: 404, description: 'Box not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.boxService.removeHard(id);
  }
}
