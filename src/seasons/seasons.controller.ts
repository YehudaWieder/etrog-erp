// src/seasons/seasons.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { SeasonsService } from './seasons.service';

@ApiTags('Seasons')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Controller('seasons')
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new harvest season. Unique constraint: [yearName].' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['yearName'],
      properties: {
        yearName: { type: 'integer', example: 2026, description: 'The four-digit year for the season.' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Season created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate year name.' })
  create(@Body('yearName', ParseIntPipe) yearName: number) {
    return this.seasonsService.createSeason(yearName);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all seasons' })
  @ApiResponse({ status: 200, description: 'List of all seasons returned successfully.' })
  findAll() {
    return this.seasonsService.findAll();
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Retrieve a season by its numeric ID or URL-friendly slug' })
  @ApiParam({ name: 'idOrSlug', type: String, description: 'The numeric ID or slug of the season.' })
  @ApiResponse({ status: 200, description: 'Season returned successfully.' })
  @ApiResponse({ status: 404, description: 'Season not found.' })
  findOne(@Param('idOrSlug') idOrSlug: string) {
    const id = parseInt(idOrSlug);
    return this.seasonsService.findOne(isNaN(id) ? idOrSlug : id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update season details by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the season to update.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        yearName: { type: 'integer', example: 2027 },
        isActive: { type: 'boolean', example: false },
      },
      example: {
        yearName: 2027,
        isActive: false,
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Season updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Season not found.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateData: any) {
    return this.seasonsService.updateSeason(id, updateData);
  }

  @Patch(':id/set-active')
  @ApiOperation({ summary: 'Set a season as the currently active season (deactivates all others)' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the season to activate.' })
  @ApiResponse({ status: 200, description: 'Season set as active successfully.' })
  @ApiResponse({ status: 404, description: 'Season not found.' })
  setActive(@Param('id', ParseIntPipe) id: number) {
    return this.seasonsService.setActiveSeason(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a season by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the season to delete.' })
  @ApiResponse({ status: 200, description: 'Season deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Season not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.seasonsService.remove(id);
  }
}
