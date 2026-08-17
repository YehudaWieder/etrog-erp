// src/inventory/controllers/customer-allocation/customer-allocation.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseEnumPipe, ParseIntPipe, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import {
  CustomerAllocationService,
  } from '../../services/customer-allocation/customer-allocation.service';
import {
  CustomerInventoryShipmentScope,
  CustomerInventorySortBy,
  } from '../../services/customer-allocation/dto/customer-inventory-summary.dto';
import { Prisma, PitamStatus } from '@prisma/client';
import { CreateCustomerAllocationDto } from '../../services/customer-allocation/dto/create-customer-allocation.dto';
import { UpdateCustomerAllocationAdjustmentDto } from '../../services/customer-allocation/dto/update-customer-allocation-adjustment.dto';
import { buildCustomerAllocationSummaryQuery } from '../../services/customer-allocation/utils/customer-allocation-query-parse.util';
import { parseOptionalInt } from 'src/inventory/services/inventory-core/utils/inventory-query-parse.util';

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
    schema: {
      type: 'object',
      required: ['date', 'customerId', 'customerCategoryId', 'pitamStatus', 'quantity', 'type', 'takenFrom'],
      properties: {
        date: { type: 'string', format: 'date-time', example: '2026-10-10T09:00:00.000Z' },
        dateHebrew: { type: 'string', example: 'י"ז תשרי תשפ"ז', nullable: true },
        customerId: { type: 'number', example: 5 },
        customerCategoryId: { type: 'number', example: 11 },
        pitamStatus: { type: 'string', enum: Object.values(PitamStatus) },
        quantity: { type: 'number', example: 80 },
        type: {
          type: 'string',
          enum: ['HARVEST_IN', 'PACKED_SHIPPED', 'SELF_PICKUP', 'WASTE', 'ADJUSTMENT', 'INTERNAL_TRANSFER', 'OWNERSHIP_TRANSFER', 'ASSIGNED'],
        },
        takenFrom: { type: 'string', example: 'GENERAL' },
        notes: { type: 'string', example: 'Reserved for customer order #A120', nullable: true },
      },
    },
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
          notes: 'Reserved for customer order #A120',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Customer allocation created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  create(@Body() data: CreateCustomerAllocationDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.allocationService.create(data as Prisma.CustomerAllocationUncheckedCreateInput, actor.id);
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
    @Query('pitamStatus', new ParseEnumPipe(PitamStatus)) pitamStatus: PitamStatus,
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
  @ApiQuery({ name: 'shipmentScope', required: false, enum: ['ALL', 'SHIPPED', 'UNSHIPPED', 'PACKED_SHIPPED', 'SELF_PICKUP', 'HARVEST_IN', 'INTERNAL_TRANSFER', 'OWNERSHIP_TRANSFER', 'ASSIGNED', 'WASTE', 'ADJUSTMENT'], description: 'Filter by movement type. Logical groups: SHIPPED = PACKED_SHIPPED + SELF_PICKUP, UNSHIPPED = all non-outbound types. Exact types: PACKED_SHIPPED, SELF_PICKUP, HARVEST_IN, INTERNAL_TRANSFER, OWNERSHIP_TRANSFER, ASSIGNED, WASTE, ADJUSTMENT.' })
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
    return this.allocationService.getInventorySummary(
      buildCustomerAllocationSummaryQuery({
        seasonId,
        customerId,
        shipmentScope,
        customerCategoryId,
        pitamStatus,
        sortBy,
        sortOrder,
      }),
    );
  }

  @Get('movements')
  @ApiOperation({
    summary:
      'Get detailed customer inventory movements filtered by season and optional customer/shipment scope.',
  })
  @ApiQuery({ name: 'seasonId', type: Number, required: false, description: 'Optional season ID. Defaults to active season.' })
  @ApiQuery({ name: 'customerId', type: Number, required: false, description: 'Optional customer ID filter.' })
  @ApiQuery({ name: 'shipmentScope', required: false, enum: ['ALL', 'SHIPPED', 'UNSHIPPED', 'PACKED_SHIPPED', 'SELF_PICKUP', 'HARVEST_IN', 'INTERNAL_TRANSFER', 'OWNERSHIP_TRANSFER', 'ASSIGNED', 'WASTE', 'ADJUSTMENT'], description: 'Filter by movement type scope.' })
  @ApiResponse({ status: 200, description: 'Detailed customer inventory movements returned successfully.' })
  getMovements(
    @Query('seasonId') seasonId?: string,
    @Query('customerId') customerId?: string,
    @Query('shipmentScope') shipmentScope?: CustomerInventoryShipmentScope,
  ) {
    return this.allocationService.getMovements({
      seasonId: parseOptionalInt(seasonId),
      customerId: parseOptionalInt(customerId),
      shipmentScope,
    });
  }

  @Patch()
  @ApiOperation({ summary: 'Update an existing customer allocation record by ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'number', example: 1 },
        quantity: { type: 'number', example: 95 },
        notes: { type: 'string', example: 'Quantity increased after customer confirmation', nullable: true },
      },
    },
    examples: {
      sample: {
        summary: 'Sample customer allocation update payload',
        value: {
          id: 1,
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
    @Body() updateData: UpdateCustomerAllocationAdjustmentDto,
    @Req() req: Request,
  ) {
    const actor = req.user as AuthenticatedUser;
    const { id, ...data } = updateData;
    return this.allocationService.update(id, data as Prisma.CustomerAllocationUncheckedUpdateInput, actor.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a customer allocation record by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the allocation to delete.' })
  @ApiResponse({ status: 200, description: 'Allocation deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Allocation not found.' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.allocationService.remove(id, actor.id);
  }

  @Post('adjustments')
  @ApiOperation({ summary: 'Create customer WASTE/ADJUSTMENT/SELF_PICKUP movement (same endpoint, different type).' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['date', 'customerId', 'customerCategoryId', 'pitamStatus', 'quantity', 'type', 'takenFrom'],
      properties: {
        date: { type: 'string', format: 'date-time', example: '2026-10-12T08:00:00.000Z' },
        dateHebrew: { type: 'string', example: 'יט תשרי תשפז', nullable: true },
        customerId: { type: 'number', example: 5 },
        customerCategoryId: { type: 'number', example: 11 },
        pitamStatus: { type: 'string', enum: Object.values(PitamStatus) },
        quantity: { type: 'number', example: 7 },
        type: { type: 'string', enum: ['WASTE', 'ADJUSTMENT', 'SELF_PICKUP'] },
        takenFrom: { type: 'string', example: 'GENERAL' },
        notes: { type: 'string', example: 'Packaging damage', nullable: true },
      },
    },
    examples: {
      waste: {
        summary: 'Create customer WASTE adjustment',
        value: {
          date: '2026-10-12T08:00:00.000Z',
          dateHebrew: 'יט תשרי תשפז',
          customerId: 5,
          customerCategoryId: 11,
          pitamStatus: 'WITH_PITAM',
          quantity: 7,
          type: 'WASTE',
          takenFrom: 'GENERAL',
          notes: 'Packaging damage',
        },
      },
      adjustment: {
        summary: 'Create customer ADJUSTMENT',
        value: {
          date: '2026-10-12T10:00:00.000Z',
          dateHebrew: 'יט תשרי תשפז',
          customerId: 7,
          customerCategoryId: 13,
          pitamStatus: 'WITHOUT_PITAM',
          quantity: 5,
          type: 'ADJUSTMENT',
          takenFrom: 'GENERAL',
          notes: 'Audit correction',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Customer adjustment movement created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid adjustment payload.' })
  createAdjustment(@Body() data: CreateCustomerAllocationDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.allocationService.createAdjustment(data as Prisma.CustomerAllocationUncheckedCreateInput, actor.id);
  }

  @Patch('adjustments')
  @ApiOperation({ summary: 'Update customer WASTE/ADJUSTMENT/SELF_PICKUP movement.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'number', example: 1 },
        quantity: { type: 'number', example: 9 },
        notes: { type: 'string', example: 'Updated after recount', nullable: true },
      },
    },
    examples: {
      update: {
        summary: 'Update customer adjustment payload',
        value: {
          id: 1,
          quantity: 9,
          notes: 'Updated after recount',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Customer adjustment movement updated successfully.' })
  @ApiResponse({ status: 404, description: 'Customer adjustment movement not found.' })
  updateAdjustment(
    @Body() data: UpdateCustomerAllocationAdjustmentDto,
    @Req() req: Request,
  ) {
    const actor = req.user as AuthenticatedUser;
    const { id, ...updateData } = data;
    return this.allocationService.updateAdjustment(id, updateData as Prisma.CustomerAllocationUncheckedUpdateInput, actor.id);
  }

  @Delete('adjustments/:id')
  @ApiOperation({ summary: 'Soft delete customer WASTE/ADJUSTMENT/SELF_PICKUP movement.' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Customer adjustment movement deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Customer adjustment movement not found.' })
  removeAdjustment(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.allocationService.removeAdjustment(id, actor.id);
  }
}
