// src/categories/controllers/customer-cat/customer-cat.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { CustomerCatService } from 'src/categories/services/customrs-cat/customrs-cat.service';
import { Prisma } from '@prisma/client';

@Controller('customer-categories')
export class CustomerCatController {
  constructor(private readonly customerCatService: CustomerCatService) {}

  @Post()
  setCustomerCategoryAndPrice(@Body() data: { 
    seasonId: number; 
    customerId: number; 
    name: string; 
    grade: any; 
    price: number; 
    currency: any 
  }) {
    return this.customerCatService.setPrice(data);
  }

  @Get('customer/:customerId')
  findByCustomer(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('seasonId', ParseIntPipe) seasonId: number,
  ) {
    return this.customerCatService.findByCustomer(customerId, seasonId);
  }

  @Get('by-customer-and-name-grade')
  findByCustomerAndNameGrade(
    @Query('customerId', ParseIntPipe) customerId: number,
    @Query('seasonId', ParseIntPipe) seasonId: number,
    @Query('name') name: string,
    @Query('grade') grade: any,
  ) {
    return this.customerCatService.findByCustomerAndNameGrade(customerId, seasonId, name, grade);
  }

  @Get('season/:seasonId')
  findAllBySeason(@Param('seasonId', ParseIntPipe) seasonId: number) {
    return this.customerCatService.findAllBySeason(seasonId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Prisma.CustomerCategoriesUpdateInput,
  ) {
    return this.customerCatService.update(id, updateData);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.customerCatService.remove(id);
  }
}