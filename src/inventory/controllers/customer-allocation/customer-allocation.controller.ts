// src/inventory/controllers/customer-allocation/customer-allocation.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { CustomerAllocationService } from '../../services/customer-allocation/customer-allocation.service';
import { Prisma } from '@prisma/client';

@Controller('customer-allocations')
export class CustomerAllocationController {
  constructor(private readonly allocationService: CustomerAllocationService) {}

  @Post()
  create(@Body() data: Prisma.CustomerAllocationUncheckedCreateInput) {
    return this.allocationService.create(data);
  }

  @Get('balance')
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
  findAll(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('seasonId', ParseIntPipe) seasonId: number,
  ) {
    return this.allocationService.findAllByCustomer(customerId, seasonId);
  }

  @Get('ledger')
  getLedger(
    @Query('seasonId', ParseIntPipe) seasonId: number,
    @Query('customerId', ParseIntPipe) customerId: number,
  ) {
    return this.allocationService.getLedger(seasonId, customerId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Prisma.CustomerAllocationUncheckedUpdateInput,
  ) {
    return this.allocationService.update(id, updateData);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.allocationService.remove(id);
  }
}