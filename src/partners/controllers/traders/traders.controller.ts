// src/partners/controllers/traders/traders.controller.ts

import { BadRequestException, Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { TradersService } from '../../services/traders/traders.service';
import { Role } from '@prisma/client';
import { Roles } from 'src/authorization/decorators/roles.decorator';
import { Request } from 'express';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { CreateTraderDto } from 'src/partners/services/traders/dto/create-trader.dto';
import { UpdateTraderDto } from 'src/partners/services/traders/dto/update-trader.dto';

@ApiTags('Partners')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Controller('traders')
export class TradersController {
  constructor(private readonly tradersService: TradersService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new trader. Unique constraint: [name].' })
  @ApiBody({
    type: CreateTraderDto,
    examples: {
      sample: {
        summary: 'Create a new trader',
        value: {
          name: 'Trader Cohen',
          paymentPercent: 12.5,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Trader created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate trader name.' })
  @Roles(Role.OWNER, Role.MANAGER)
  create(@Body() data: CreateTraderDto) {
    if (data.paymentPercent === undefined || data.paymentPercent === null) {
      throw new BadRequestException('paymentPercent is required');
    }

    return this.tradersService.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve a list of all registered traders. Editor returns only id and name.' })
  @ApiResponse({ status: 200, description: 'List of traders returned successfully.' })
  findAll(@Req() req: Request) {
    return this.tradersService.findAllByActor(req.user as AuthenticatedUser);
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Retrieve a single trader by their numeric ID or URL-friendly slug' })
  @ApiParam({ name: 'idOrSlug', type: String, description: 'The numeric ID or slug of the trader.' })
  @ApiResponse({ status: 200, description: 'Trader returned successfully.' })
  @ApiResponse({ status: 404, description: 'Trader not found.' })
  findOne(@Param('idOrSlug') idOrSlug: string, @Req() req: Request) {
    const id = parseInt(idOrSlug);
    return this.tradersService.findOneByActor(isNaN(id) ? idOrSlug : id, req.user as AuthenticatedUser);
  }

  @Patch()
  @ApiOperation({ summary: 'Update trader details (name, payment percentage) by ID' })
  @ApiBody({
    type: UpdateTraderDto,
    examples: {
      sample: {
        summary: 'Update a trader by ID',
        value: {
          id: 1,
          name: 'Trader Levi',
          paymentPercent: 15,
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Trader updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Trader not found.' })
  @Roles(Role.OWNER, Role.MANAGER)
  update(@Body() updateData: UpdateTraderDto) {
    if (updateData.paymentPercent === undefined || updateData.paymentPercent === null) {
      throw new BadRequestException('paymentPercent is required');
    }

    return this.tradersService.update(updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a trader from the system by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the trader to remove.' })
  @ApiResponse({ status: 200, description: 'Trader removed successfully.' })
  @ApiResponse({ status: 404, description: 'Trader not found.' })
  @Roles(Role.OWNER, Role.MANAGER)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tradersService.remove(id);
  }
}
