// src/shipments/controllers/shipment/shipment.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { ShipmentService } from '../../services/shipment/shipment.service';
import { Prisma } from '@prisma/client';
import { ShipmentSwaggerDto } from 'src/docs/dto/swagger-enums.dto';

@ApiTags('Logistics')
@ApiBearerAuth('access-token')
@Controller('shipments')
export class ShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new shipment. A unique shipment number is auto-assigned per season.' })
  @ApiBody({
    type: ShipmentSwaggerDto,
    examples: {
      sample: {
        summary: 'Sample shipment create payload',
        value: {
          seasonId: 1,
          status: 'PREPARING',
          updatedById: 1,
          slug: 'season-1-shipment-1001',
          notes: 'Shipment for EU distribution center',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Shipment created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  create(@Body() data: Prisma.ShipmentUncheckedCreateInput) {
    return this.shipmentService.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all shipments for a specific season' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season to filter shipments by.' })
  @ApiResponse({ status: 200, description: 'List of shipments returned successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing seasonId query parameter.' })
  findAll(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.shipmentService.findAllBySeason(seasonId);
  }

  @Get('by-number')
  @ApiOperation({ summary: 'Find a shipment by its sequential shipment number within a season. Unique constraint: [seasonId, shipmentNumber].' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season.' })
  @ApiQuery({ name: 'shipmentNumber', type: Number, description: 'The sequential shipment number.' })
  @ApiResponse({ status: 200, description: 'Matching shipment returned.' })
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
  @ApiResponse({ status: 200, description: 'Shipment returned successfully.' })
  @ApiResponse({ status: 404, description: 'Shipment not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.shipmentService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update shipment details (status, notes, etc.) by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the shipment to update.' })
  @ApiBody({
    type: ShipmentSwaggerDto,
    examples: {
      sample: {
        summary: 'Sample shipment update payload',
        value: {
          status: 'SHIPPED',
          shippedAt: '2026-10-12T13:20:00.000Z',
          notes: 'Left warehouse gate at 13:20',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Shipment updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Shipment not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Prisma.ShipmentUncheckedUpdateInput,
  ) {
    return this.shipmentService.update(id, updateData);
  }

  @Patch(':id/recalculate')
  @ApiOperation({ summary: 'Recalculate and update the total boxes and total quantity for a shipment' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the shipment to recalculate.' })
  @ApiResponse({ status: 200, description: 'Shipment totals recalculated successfully.' })
  @ApiResponse({ status: 404, description: 'Shipment not found.' })
  recalculate(@Param('id', ParseIntPipe) id: number) {
    return this.shipmentService.updateTotals(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a shipment by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the shipment to delete.' })
  @ApiResponse({ status: 200, description: 'Shipment deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Shipment not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.shipmentService.remove(id);
  }
}