// src/partners/controllers/customers/customers.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { CustomersService } from '../../services/customers/customers.service';
import { Prisma } from '@prisma/client';

@ApiTags('Partners')
@ApiBearerAuth('access-token')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new customer. Unique constraints: [customerName], [email], [phone].' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['customerName'],
      properties: {
        customerName: { type: 'string', description: 'The unique name of the customer.', example: 'Fresh Market Ltd' },
        email: { type: 'string', format: 'email', description: 'Optional unique email address.', nullable: true, example: 'orders@fresh-market.co.il' },
        phone: { type: 'string', description: 'Optional unique phone number.', nullable: true, example: '0501234567' },
      },
      example: {
        customerName: 'Fresh Market Ltd',
        email: 'orders@fresh-market.co.il',
        phone: '0501234567',
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Customer created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate customer name/email/phone.' })
  create(@Body() data: { customerName: string; email?: string; phone?: string }) {
    return this.customersService.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve a list of all registered customers' })
  @ApiResponse({ status: 200, description: 'List of customers returned successfully.' })
  findAll() {
    return this.customersService.findAll();
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Retrieve a single customer by their numeric ID or URL-friendly slug' })
  @ApiParam({ name: 'idOrSlug', type: String, description: 'The numeric ID or slug of the customer.' })
  @ApiResponse({ status: 200, description: 'Customer returned successfully.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  findOne(@Param('idOrSlug') idOrSlug: string) {
    const id = parseInt(idOrSlug);
    return this.customersService.findOne(isNaN(id) ? idOrSlug : id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer details by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the customer to update.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        customerName: { type: 'string', example: 'Global Fruits GmbH' },
        email: { type: 'string', format: 'email', example: 'logistics@globalfruits.eu' },
        phone: { type: 'string', example: '0527654321' },
      },
      example: {
        customerName: 'Global Fruits GmbH',
        email: 'logistics@globalfruits.eu',
        phone: '0527654321',
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Customer updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Partial<Prisma.CustomerUpdateInput>,
  ) {
    return this.customersService.update(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a customer from the system by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the customer to remove.' })
  @ApiResponse({ status: 200, description: 'Customer removed successfully.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.remove(id);
  }
}