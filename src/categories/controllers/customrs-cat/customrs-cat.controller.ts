// src/categories/controllers/customer-cat/customer-cat.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { CustomerCatService } from 'src/categories/services/customrs-cat/customrs-cat.service';
import { Prisma, Grade, Currency, Role } from '@prisma/client';
import { CustomerCategorySwaggerDto, CustomerCategoryUpdateSwaggerDto } from 'src/docs/dto/swagger-enums.dto';
import type { Request } from 'express';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { Roles } from 'src/authorization/decorators/roles.decorator';

@ApiTags('Categories')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Roles(Role.OWNER, Role.MANAGER)
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
    price?: number; 
    currency?: Currency 
  }, @Req() req: Request) {
    return this.customerCatService.setPrice(data, req.user as AuthenticatedUser);
  }

  @Get('by-customer')
  @Roles()
  @ApiOperation({ summary: 'Retrieve all category prices for a specific customer within a season' })
  @ApiQuery({ name: 'customerId', type: Number, description: 'The ID of the customer.' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season.' })
  @ApiResponse({ status: 200, description: 'List of customer categories returned successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing seasonId query parameter.' })
  findByCustomer(
    @Query('customerId', ParseIntPipe) customerId: number,
    @Query('seasonId', ParseIntPipe) seasonId: number,
    @Req() req: Request,
  ) {
    return this.customerCatService.findByCustomer(customerId, seasonId, req.user as AuthenticatedUser);
  }

  @Get('by-customer-and-name-grade')
  @Roles()
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
    @Req() req: Request,
  ) {
    return this.customerCatService.findByCustomerAndNameGrade(customerId, seasonId, name, grade, req.user as AuthenticatedUser);
  }

  @Get()
  @Roles()
  @ApiOperation({ summary: 'Retrieve all customer categories across all customers for a specific season' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season.' })
  @ApiResponse({ status: 200, description: 'List of all customer categories for the season returned.' })
  @ApiResponse({ status: 400, description: 'Invalid season ID.' })
  findAllBySeason(@Query('seasonId', ParseIntPipe) seasonId: number, @Req() req: Request) {
    return this.customerCatService.findAllBySeason(seasonId, req.user as AuthenticatedUser);
  }

  @Get(':id')
  @Roles()
  @ApiOperation({ summary: 'Retrieve a single customer category by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the customer category.' })
  @ApiResponse({ status: 200, description: 'Customer category returned successfully.' })
  @ApiResponse({ status: 404, description: 'Customer category not found.' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.customerCatService.findOne(id, req.user as AuthenticatedUser);
  }

  @Patch()
  @ApiOperation({ summary: 'Update a customer category record by ID' })
  @ApiBody({
    type: CustomerCategoryUpdateSwaggerDto,
    examples: {
      sample: {
        summary: 'Update a customer category by ID',
        value: {
          id: 1,
          seasonId: 2,
          customerId: 15,
          name: 'Yanover',
          grade: Object.values(Grade)[0],
          price: 125.5,
          currency: Currency.ILS,
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Customer category updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Customer category not found.' })
  update(
    @Body() updateData: CustomerCategoryUpdateSwaggerDto,
    @Req() req: Request,
  ) {
    const { id, ...data } = updateData;
    return this.customerCatService.update(id, data as Prisma.CustomerCategoriesUpdateInput, req.user as AuthenticatedUser);
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
