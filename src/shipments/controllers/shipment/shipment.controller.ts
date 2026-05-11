// src/shipments/controllers/shipment/shipment.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ShipmentService } from '../../services/shipment/shipment.service';
import { ShipmentStatus } from '@prisma/client';
import { CreateShipmentSwaggerDto, ShipmentResponseSwaggerDto, UpdateShipmentSwaggerDto } from 'src/docs/dto/swagger-enums.dto';

type ShipmentCreateBody = {
  notes?: string;
  status?: ShipmentStatus;
  shippedAt?: string | Date;
};

type ShipmentUpdateBody = {
  notes?: string | null;
  status?: ShipmentStatus;
  shippedAt?: string | Date;
};

@ApiTags('Logistics')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Controller('shipments')
export class ShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new shipment. ID, shipmentNumber, seasonId, totals, and slug are auto-managed by the server.' })
  @ApiBody({
    type: CreateShipmentSwaggerDto,
    examples: {
      sample: {
        summary: 'Sample shipment create payload',
        value: {
          status: 'PREPARING',
          notes: 'Shipment for EU distribution center',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Shipment created successfully.', type: ShipmentResponseSwaggerDto })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  create(@Body() data: ShipmentCreateBody, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.shipmentService.create(data, actor.id);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all shipments for a specific season' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season to filter shipments by.' })
  @ApiResponse({ status: 200, description: 'List of shipments returned successfully.', type: ShipmentResponseSwaggerDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Invalid or missing seasonId query parameter.' })
  findAll(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.shipmentService.findAllBySeason(seasonId);
  }

  @Get('by-number')
  @ApiOperation({ summary: 'Find a shipment by its sequential shipment number within a season. Unique constraint: [seasonId, shipmentNumber].' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season.' })
  @ApiQuery({ name: 'shipmentNumber', type: Number, description: 'The sequential shipment number.' })
  @ApiResponse({ status: 200, description: 'Matching shipment returned.', type: ShipmentResponseSwaggerDto })
  @ApiResponse({ status: 404, description: 'Shipment not found for the given season and number.' })
  findByNumber(
    @Query('seasonId', ParseIntPipe) seasonId: number,
    @Query('shipmentNumber', ParseIntPipe) shipmentNumber: number,
  ) {
    return this.shipmentService.findByNumber(seasonId, shipmentNumber);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single shipment by ID, including its boxes and items' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the shipment.' })
  @ApiResponse({ status: 200, description: 'Shipment returned successfully.', type: ShipmentResponseSwaggerDto })
  @ApiResponse({ status: 404, description: 'Shipment not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.shipmentService.findOne(id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update shipment details by ID. Editable fields: status, shippedAt, notes.' })
  @ApiBody({
    type: UpdateShipmentSwaggerDto,
    examples: {
      sample: {
        summary: 'Sample shipment update payload',
        value: {
          id: 42,
          status: 'SHIPPED',
          shippedAt: '2026-10-12T13:20:00.000Z',
          notes: 'Left warehouse gate at 13:20',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Shipment updated successfully.', type: ShipmentResponseSwaggerDto })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Shipment not found.' })
  update(
    @Body() updateData: UpdateShipmentSwaggerDto,
    @Req() req: Request,
  ) {
    const { id, ...data } = updateData;
    const actor = req.user as AuthenticatedUser;
    return this.shipmentService.update(id, data as ShipmentUpdateBody, actor.id);
  }

  @Patch('recalculate')
  @ApiOperation({ summary: 'Recalculate and update the total boxes and total quantity for a shipment' })
  @ApiBody({
    type: UpdateShipmentSwaggerDto,
    examples: {
      sample: {
        summary: 'Recalculate payload',
        value: { id: 42 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Shipment totals recalculated successfully.' })
  @ApiResponse({ status: 404, description: 'Shipment not found.' })
  recalculate(@Body() data: UpdateShipmentSwaggerDto) {
    return this.shipmentService.updateTotals(data.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete a shipment, all its boxes and all their items. This action is irreversible.' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the shipment to permanently delete.' })
  @ApiResponse({ status: 200, description: 'Shipment and all related data permanently deleted.' })
  @ApiResponse({ status: 404, description: 'Shipment not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.shipmentService.removeHard(id);
  }
}
