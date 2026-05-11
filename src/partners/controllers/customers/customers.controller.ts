// src/partners/controllers/customers/customers.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { CustomersService } from '../../services/customers/customers.service';
import { Prisma, Role } from '@prisma/client';
import { Roles } from 'src/authorization/decorators/roles.decorator';
import { Request } from 'express';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { CustomerUpdateSwaggerDto } from 'src/docs/dto/swagger-enums.dto';

@ApiTags('Partners')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
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
  @Roles(Role.OWNER, Role.MANAGER)
  create(@Body() data: { customerName: string; email?: string; phone?: string }) {
    return this.customersService.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve a list of all registered customers. Worker returns only id and customerName.' })
  @ApiResponse({ status: 200, description: 'List of customers returned successfully.' })
  findAll(@Req() req: Request) {
    return this.customersService.findAllByActor(req.user as AuthenticatedUser);
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Retrieve a single customer by their numeric ID or URL-friendly slug' })
  @ApiParam({ name: 'idOrSlug', type: String, description: 'The numeric ID or slug of the customer.' })
  @ApiResponse({ status: 200, description: 'Customer returned successfully.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  findOne(@Param('idOrSlug') idOrSlug: string, @Req() req: Request) {
    const id = parseInt(idOrSlug);
    return this.customersService.findOneByActor(isNaN(id) ? idOrSlug : id, req.user as AuthenticatedUser);
  }

  @Patch()
  @ApiOperation({ summary: 'Update customer details by ID' })
  @ApiBody({
    type: CustomerUpdateSwaggerDto,
    examples: {
      sample: {
        summary: 'Update a customer by ID',
        value: {
          id: 1,
          customerName: 'Global Fruits GmbH',
          email: 'logistics@globalfruits.eu',
          phone: '0527654321',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Customer updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  @Roles(Role.OWNER, Role.MANAGER)
  update(
    @Body() updateData: CustomerUpdateSwaggerDto,
  ) {
    const { id, ...data } = updateData;
    return this.customersService.update(id, data as Partial<Prisma.CustomerUpdateInput>);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a customer from the system by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the customer to remove.' })
  @ApiResponse({ status: 200, description: 'Customer removed successfully.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  @Roles(Role.OWNER, Role.MANAGER)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.remove(id);
  }
}
