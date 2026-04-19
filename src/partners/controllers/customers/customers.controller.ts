// src/partners/controllers/customers/customers.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { CustomersService } from '../../services/customers/customers.service';
import { Prisma } from '@prisma/client';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@Body() data: { customerName: string; email?: string; phone?: string }) {
    return this.customersService.create(data);
  }

  @Get()
  findAll() {
    return this.customersService.findAll();
  }

  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string) {
    const id = parseInt(idOrSlug);
    return this.customersService.findOne(isNaN(id) ? idOrSlug : id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateData: Partial<Prisma.CustomerUpdateInput>
  ) {
    return this.customersService.update(id, updateData);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.remove(id);
  }
}