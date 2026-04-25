// src/partners/controllers/traders/traders.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { TradersService } from '../../services/traders/traders.service';
import { Prisma } from '@prisma/client';

@ApiTags('Partners')
@ApiBearerAuth('access-token')
@Controller('traders')
export class TradersController {
  constructor(private readonly tradersService: TradersService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new trader. Unique constraint: [name].' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', description: 'The unique name of the trader.', example: 'Trader Cohen' },
        paymentPercent: { type: 'number', description: 'Optional payment percentage for the trader.', nullable: true, example: 12.5 },
      },
      example: {
        name: 'Trader Cohen',
        paymentPercent: 12.5,
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Trader created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate trader name.' })
  create(
    @Body('name') name: string,
    @Body('paymentPercent') paymentPercent?: number,
  ) {
    return this.tradersService.create(name, paymentPercent);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve a list of all registered traders' })
  @ApiResponse({ status: 200, description: 'List of traders returned successfully.' })
  findAll() {
    return this.tradersService.findAll();
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Retrieve a single trader by their numeric ID or URL-friendly slug' })
  @ApiParam({ name: 'idOrSlug', type: String, description: 'The numeric ID or slug of the trader.' })
  @ApiResponse({ status: 200, description: 'Trader returned successfully.' })
  @ApiResponse({ status: 404, description: 'Trader not found.' })
  findOne(@Param('idOrSlug') idOrSlug: string) {
    const id = parseInt(idOrSlug);
    return this.tradersService.findOne(isNaN(id) ? idOrSlug : id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update trader details (name, payment percentage) by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the trader to update.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Trader Levi' },
        paymentPercent: { type: 'number', example: 15 },
      },
      example: {
        name: 'Trader Levi',
        paymentPercent: 15,
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Trader updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Trader not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Partial<Prisma.TraderUpdateInput>,
  ) {
    return this.tradersService.update(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a trader from the system by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the trader to remove.' })
  @ApiResponse({ status: 200, description: 'Trader removed successfully.' })
  @ApiResponse({ status: 404, description: 'Trader not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tradersService.remove(id);
  }
}