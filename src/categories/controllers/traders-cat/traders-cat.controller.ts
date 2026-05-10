// src/categories/controllers/traders-cat/traders-cat.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { TradersCatService } from '../../services/traders-cat/traders-cat.service';
import { Prisma, Role } from '@prisma/client';
import { Roles } from 'src/authorization/decorators/roles.decorator';
import type { Request } from 'express';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

@ApiTags('Categories')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Roles(Role.OWNER, Role.MANAGER)
@Controller('traders-categories')
export class TradersCatController {
  constructor(private readonly tradersCatService: TradersCatService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new trader category for the active season. Unique constraint: [name, seasonId].' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', description: 'The category name (e.g., "Yanover").', example: 'Yanover Premium' },
        notes: { type: 'string', description: 'Optional notes about the category.', nullable: true, example: 'Large-size export category' },
      },
      example: {
        name: 'Yanover Premium',
        notes: 'Large-size export category',
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Trader category created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate category name within the season.' })
  create(
    @Body('name') name: string,
    @Body('notes') notes?: string,
  ) {
    return this.tradersCatService.create(name, notes);
  }

  @Get()
  @Roles()
  @ApiOperation({ summary: 'Retrieve all trader categories for a specific season' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season to filter categories by.' })
  @ApiResponse({ status: 200, description: 'List of trader categories returned successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing seasonId query parameter.' })
  findAll(@Query('seasonId', ParseIntPipe) seasonId: number, @Req() req: Request) {
    return this.tradersCatService.findAllBySeason(seasonId, req.user as AuthenticatedUser);
  }

  @Get('by-name')
  @Roles()
  @ApiOperation({ summary: 'Find a trader category by name within a season (composite key lookup)' })
  @ApiQuery({ name: 'name', type: String, description: 'The name of the trader category.' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season.' })
  @ApiResponse({ status: 200, description: 'Matching trader category returned.' })
  @ApiResponse({ status: 404, description: 'No category found with the given name in the specified season.' })
  findByName(
    @Query('name') name: string,
    @Query('seasonId', ParseIntPipe) seasonId: number,
    @Req() req: Request,
  ) {
    return this.tradersCatService.findByName(name, seasonId, req.user as AuthenticatedUser);
  }

  @Get(':id')
  @Roles()
  @ApiOperation({ summary: 'Retrieve a single trader category by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the trader category.' })
  @ApiResponse({ status: 200, description: 'Trader category returned successfully.' })
  @ApiResponse({ status: 404, description: 'Trader category not found.' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.tradersCatService.findOne(id, req.user as AuthenticatedUser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a trader category by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the trader category to update.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Yanover Premium Updated' },
        notes: { type: 'string', example: 'Adjusted classification notes' },
      },
      example: {
        name: 'Yanover Premium Updated',
        notes: 'Adjusted classification notes',
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Trader category updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Trader category not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Prisma.TradersCategoriesUpdateInput,
  ) {
    return this.tradersCatService.update(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a trader category by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the trader category to delete.' })
  @ApiResponse({ status: 200, description: 'Trader category deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Trader category not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tradersCatService.remove(id);
  }
}
