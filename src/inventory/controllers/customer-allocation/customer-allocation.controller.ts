// src/inventory/controllers/customer-allocation/customer-allocation.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import {
  CustomerAllocationService,
  CustomerInventoryShipmentScope,
  CustomerInventorySortBy,
} from '../../services/customer-allocation/customer-allocation.service';
import { Prisma, PitamStatus } from 'src/generated/prisma';
import { CustomerAllocationSwaggerDto } from 'src/docs/dto/swagger-enums.dto';

@ApiTags('Inventory')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Controller('customer-allocations')
export class CustomerAllocationController {
  constructor(private readonly allocationService: CustomerAllocationService) {}

  @Post()
  @ApiOperation({ summary: 'Record a new customer allocation (sale or transfer)' })
  @ApiBody({
    type: CustomerAllocationSwaggerDto,
    examples: {
      sample: {
        summary: 'Sample customer allocation payload',
        value: {
          seasonId: 1,
          date: '2026-10-10T09:00:00.000Z',
          dateHebrew: 'י"ז תשרי תשפ"ז',
          customerId: 5,
          customerCategoryId: 11,
          pitamStatus: 'WITH_PITAM',
          quantity: 80,
          type: 'HARVEST_IN',
          takenFrom: 'GENERAL',
          updatedById: 1,
          notes: 'Reserved for customer order #A120',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Customer allocation created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  create(@Body() data: Prisma.CustomerAllocationUncheckedCreateInput) {
    return this.allocationService.create(data);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get the net allocation balance for a customer category filtered by pitam status' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season.' })
  @ApiQuery({ name: 'customerId', type: Number, description: 'The ID of the customer.' })
  @ApiQuery({ name: 'customerCategoryId', type: Number, description: 'The ID of the customer category.' })
  @ApiQuery({ name: 'pitamStatus', enum: PitamStatus, enumName: 'PitamStatus', description: 'The pitam status to filter by.' })
  @ApiResponse({ status: 200, description: 'Current allocation balance returned.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing query parameters.' })
  getBalance(
    @Query('seasonId', ParseIntPipe) seasonId: number,
    @Query('customerId', ParseIntPipe) customerId: number,
    @Query('customerCategoryId', ParseIntPipe) customerCategoryId: number,
    @Query('pitamStatus') pitamStatus: any,
  ) {
    return this.allocationService.getBalance({
      seasonId,
      customerId,
      customerCategoryId,
      pitamStatus,
    });
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Retrieve all allocations for a specific customer within a season' })
  @ApiParam({ name: 'customerId', type: Number, description: 'The ID of the customer.' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season.' })
  @ApiResponse({ status: 200, description: 'List of customer allocations returned successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing seasonId query parameter.' })
  findAll(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('seasonId', ParseIntPipe) seasonId: number,
  ) {
    return this.allocationService.findAllByCustomer(customerId, seasonId);
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Retrieve the full allocation ledger for a customer across all categories in a season' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season.' })
  @ApiQuery({ name: 'customerId', type: Number, description: 'The ID of the customer.' })
  @ApiResponse({ status: 200, description: 'Customer allocation ledger returned successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing query parameters.' })
  getLedger(
    @Query('seasonId', ParseIntPipe) seasonId: number,
    @Query('customerId', ParseIntPipe) customerId: number,
  ) {
    return this.allocationService.getLedger(seasonId, customerId);
  }

  @Get('summary')
  @ApiOperation({
    summary:
      'Get aggregated customer inventory summary for all customers or a specific customer, with shipped/unshipped filters and sorting.',
  })
  @ApiQuery({ name: 'seasonId', type: Number, required: false, description: 'Optional season ID. Defaults to active season.' })
  @ApiQuery({ name: 'customerId', type: Number, required: false, description: 'Optional customer ID. When omitted, returns all customers together.' })
  @ApiQuery({ name: 'shipmentScope', required: false, enum: ['ALL', 'SHIPPED', 'UNSHIPPED', 'PACKED_SHIPPED', 'SELF_PICKUP'], description: 'PACKED_SHIPPED = shipment only, SELF_PICKUP = self pickup only, SHIPPED = both outbound types together, UNSHIPPED = all other movement types. Quantity sign is preserved from the ledger.' })
  @ApiQuery({ name: 'customerCategoryId', type: Number, required: false, description: 'Optional customer category filter.' })
  @ApiQuery({ name: 'pitamStatus', enum: PitamStatus, enumName: 'PitamStatus', required: false, description: 'Optional pitam status filter.' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['category', 'customer', 'quantity', 'pitamStatus', 'updatedAt'], description: 'Sort field.' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort direction.' })
  @ApiResponse({ status: 200, description: 'Aggregated customer inventory summary returned successfully.' })
  getSummary(
    @Query('seasonId') seasonId?: string,
    @Query('customerId') customerId?: string,
    @Query('shipmentScope') shipmentScope?: CustomerInventoryShipmentScope,
    @Query('customerCategoryId') customerCategoryId?: string,
    @Query('pitamStatus') pitamStatus?: PitamStatus,
    @Query('sortBy') sortBy?: CustomerInventorySortBy,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.allocationService.getInventorySummary({
      seasonId: seasonId ? parseInt(seasonId) : undefined,
      customerId: customerId ? parseInt(customerId) : undefined,
      shipmentScope,
      customerCategoryId: customerCategoryId ? parseInt(customerCategoryId) : undefined,
      pitamStatus,
      sortBy,
      sortOrder,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing customer allocation record by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the allocation to update.' })
  @ApiBody({
    type: CustomerAllocationSwaggerDto,
    examples: {
      sample: {
        summary: 'Sample customer allocation update payload',
        value: {
          quantity: 95,
          notes: 'Quantity increased after customer confirmation',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Allocation updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Allocation not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Prisma.CustomerAllocationUncheckedUpdateInput,
  ) {
    return this.allocationService.update(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a customer allocation record by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the allocation to delete.' })
  @ApiResponse({ status: 200, description: 'Allocation deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Allocation not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.allocationService.remove(id);
  }

  @Post('adjustments')
  @ApiOperation({ summary: 'Create customer WASTE/ADJUSTMENT/SELF_PICKUP movement (same endpoint, different type).' })
  @ApiBody({ type: CustomerAllocationSwaggerDto })
  @ApiResponse({ status: 201, description: 'Customer adjustment movement created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid adjustment payload.' })
  createAdjustment(@Body() data: Prisma.CustomerAllocationUncheckedCreateInput) {
    return this.allocationService.createAdjustment(data);
  }

  @Patch('adjustments/:id')
  @ApiOperation({ summary: 'Update customer WASTE/ADJUSTMENT/SELF_PICKUP movement.' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: CustomerAllocationSwaggerDto })
  @ApiResponse({ status: 200, description: 'Customer adjustment movement updated successfully.' })
  @ApiResponse({ status: 404, description: 'Customer adjustment movement not found.' })
  updateAdjustment(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Prisma.CustomerAllocationUncheckedUpdateInput,
  ) {
    return this.allocationService.updateAdjustment(id, data);
  }

  @Delete('adjustments/:id')
  @ApiOperation({ summary: 'Soft delete customer WASTE/ADJUSTMENT/SELF_PICKUP movement.' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Customer adjustment movement deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Customer adjustment movement not found.' })
  removeAdjustment(@Param('id', ParseIntPipe) id: number) {
    return this.allocationService.removeAdjustment(id);
  }
}
