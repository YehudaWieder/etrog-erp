// src/categories/controllers/customer-cat/customer-cat.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { CustomerCatService } from 'src/categories/services/customrs-cat/customrs-cat.service';
import { Prisma, Grade, Currency } from '@prisma/client';
import { CustomerCategorySwaggerDto } from 'src/docs/dto/swagger-enums.dto';

@ApiTags('Categories')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Controller('customer-categories')
export class CustomerCatController {
  constructor(private readonly customerCatService: CustomerCatService) {}

  @Post()
  @ApiOperation({ summary: 'Create or update a customer category with its price for a season. Unique constraint: [seasonId, customerId, name, grade].' })
  @ApiBody({ type: CustomerCategorySwaggerDto })
  @ApiResponse({ status: 201, description: 'Customer category and price set successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate category for this customer and season.' })
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
  @ApiOperation({ summary: 'Retrieve all category prices for a specific customer within a season' })
  @ApiParam({ name: 'customerId', type: Number, description: 'The ID of the customer.' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season.' })
  @ApiResponse({ status: 200, description: 'List of customer categories returned successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing seasonId query parameter.' })
  findByCustomer(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('seasonId', ParseIntPipe) seasonId: number,
  ) {
    return this.customerCatService.findByCustomer(customerId, seasonId);
  }

  @Get('by-customer-and-name-grade')
  @ApiOperation({ summary: 'Find a specific customer category by customer, name, grade, and season (composite key lookup)' })
  @ApiQuery({ name: 'customerId', type: Number, description: 'The ID of the customer.' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season.' })
  @ApiQuery({ name: 'name', type: String, description: 'The category name.' })
  @ApiQuery({ name: 'grade', enum: Grade, enumName: 'Grade', description: 'The etrog grade.' })
  @ApiResponse({ status: 200, description: 'Matching customer category returned.' })
  @ApiResponse({ status: 404, description: 'No category found for the given combination.' })
  findByCustomerAndNameGrade(
    @Query('customerId', ParseIntPipe) customerId: number,
    @Query('seasonId', ParseIntPipe) seasonId: number,
    @Query('name') name: string,
    @Query('grade') grade: any,
  ) {
    return this.customerCatService.findByCustomerAndNameGrade(customerId, seasonId, name, grade);
  }

  @Get('season/:seasonId')
  @ApiOperation({ summary: 'Retrieve all customer categories across all customers for a specific season' })
  @ApiParam({ name: 'seasonId', type: Number, description: 'The ID of the season.' })
  @ApiResponse({ status: 200, description: 'List of all customer categories for the season returned.' })
  @ApiResponse({ status: 400, description: 'Invalid season ID.' })
  findAllBySeason(@Param('seasonId', ParseIntPipe) seasonId: number) {
    return this.customerCatService.findAllBySeason(seasonId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer category record by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the customer category to update.' })
  @ApiResponse({ status: 200, description: 'Customer category updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Customer category not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Prisma.CustomerCategoriesUpdateInput,
  ) {
    return this.customerCatService.update(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a customer category record by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the customer category to delete.' })
  @ApiResponse({ status: 200, description: 'Customer category deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Customer category not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.customerCatService.remove(id);
  }
}
