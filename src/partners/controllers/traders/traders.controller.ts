// src/partners/controllers/traders/traders.controller.ts

import { Controller,  Get,  Post,  Patch,  Delete,  Body,  Param,  ParseIntPipe } from '@nestjs/common';
import { TradersService } from '../../services/traders/traders.service';
import { Prisma } from '@prisma/client';

@Controller('traders')
export class TradersController {
  constructor(private readonly tradersService: TradersService) {}

  // Create a new trader
  @Post()
  create(
    @Body('name') name: string, 
    @Body('paymentPercent') paymentPercent?: number
  ) {
    return this.tradersService.create(name, paymentPercent);
  }

  // Get all traders list
  @Get()
  findAll() {
    return this.tradersService.findAll();
  }

  // Get a specific trader by ID or Slug
  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string) {
    const id = parseInt(idOrSlug);
    // If idOrSlug is a number, we search by ID, otherwise by Slug
    return this.tradersService.findOne(isNaN(id) ? idOrSlug : id);
  }

  // Update trader details (name, payment percent, etc.)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateData: Partial<Prisma.TraderUpdateInput>
  ) {
    return this.tradersService.update(id, updateData);
  }

  // Remove a trader from the system
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tradersService.remove(id);
  }
}