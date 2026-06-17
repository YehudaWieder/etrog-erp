// src/shipments/controllers/box/box.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { BoxService } from '../../services/box/box.service';
import { BoxResponseSwaggerDto } from 'src/docs/dto/swagger-enums.dto';
import { CreateBoxDto } from '../../services/box/dto/create-box.dto';
import { UpdateBoxDto } from '../../services/box/dto/update-box.dto';

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
    type: CreateBoxDto,
    examples: {
      traderBox: {
        summary: 'Box owned by a trader',
        value: {
          shipmentId: 15,
          boxNumber: 3,
          boxType: 'MEDIUM',
          ownershipType: 'TRADER',
          traderId: 3,
          notes: 'Dedicated box for trader 3',
        },
      },
      unassignedBox: {
        summary: 'General box (minimum required fields)',
        value: {
          shipmentId: 15,
          boxNumber: 4,
          boxType: 'SMALL',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Box created successfully.', type: BoxResponseSwaggerDto })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate box number in this shipment.' })
  create(@Body() data: CreateBoxDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.boxService.create(data, actor.id);
  }

  @Get('shipment/:shipmentId')
  @ApiOperation({ summary: 'Retrieve all boxes belonging to a specific shipment' })
  @ApiParam({ name: 'shipmentId', type: Number, description: 'The ID of the shipment.' })
  @ApiResponse({ status: 200, description: 'List of boxes returned successfully.', type: BoxResponseSwaggerDto, isArray: true })
  @ApiResponse({ status: 404, description: 'Shipment not found.' })
  findByShipment(@Param('shipmentId', ParseIntPipe) shipmentId: number) {
    return this.boxService.findByShipment(shipmentId);
  }

  @Get('open')
  @ApiOperation({ summary: 'Retrieve all OPEN boxes for the active season, including shipment, trader and customer info' })
  @ApiResponse({ status: 200, description: 'List of open boxes returned successfully.' })
  findOpen() {
    return this.boxService.findOpenForActiveSeason();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single box by ID, including its items' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the box.' })
  @ApiResponse({ status: 200, description: 'Box returned successfully.', type: BoxResponseSwaggerDto })
  @ApiResponse({ status: 404, description: 'Box not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.boxService.findOne(id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update box details by ID. Editable fields: boxType, status, notes, ownershipType, traderId, customerId.' })
  @ApiBody({
    type: UpdateBoxDto,
    examples: {
      closeBox: {
        summary: 'Close a box',
        value: {
          id: 101,
          status: 'CLOSED',
          notes: 'Sealed and ready for dispatch',
        },
      },
      assignToCustomer: {
        summary: 'Reassign ownership to a customer',
        value: {
          id: 101,
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
    @Body() updateData: UpdateBoxDto,
    @Req() req: Request,
  ) {
    const { id, ...data } = updateData;
    const actor = req.user as AuthenticatedUser;
    return this.boxService.update(id, data, actor.id);
  }

  @Patch('recalculate')
  @ApiOperation({ summary: 'Recalculate and update the total quantity for a box based on its items' })
  @ApiBody({
    type: UpdateBoxDto,
    examples: {
      sample: {
        summary: 'Recalculate payload',
        value: { id: 101 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Box total recalculated successfully.' })
  @ApiResponse({ status: 404, description: 'Box not found.' })
  recalculate(@Body() data: UpdateBoxDto) {
    return this.boxService.updateBoxTotal(data.id);
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
