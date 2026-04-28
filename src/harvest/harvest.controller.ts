// src/harvest/harvest.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { HarvestService } from './harvest.service';
import { HarvestBulkService } from './harvest-bulk.service';
import { Prisma } from '@prisma/client';
import { HarvestBulkCreateDto, UpdateClassificationDto } from 'src/docs/dto/swagger-enums.dto';

@ApiTags('Operations')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Controller('harvests')
export class HarvestController {
  constructor(
    private readonly harvestService: HarvestService,
    private readonly harvestBulkService: HarvestBulkService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Record a new field harvest entry' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['seasonId', 'dateGregorian', 'dateHebrew', 'fieldId', 'updatedById'],
      properties: {
        seasonId: { type: 'integer', example: 1 },
        dateGregorian: { type: 'string', format: 'date-time', example: '2026-10-05T06:00:00.000Z' },
        dateHebrew: { type: 'string', example: 'י"ב תשרי תשפ"ז' },
        fieldId: { type: 'integer', example: 2 },
        updatedById: { type: 'integer', example: 1 },
        totalHarvested: { type: 'integer', example: 1500 },
      },
      example: {
        seasonId: 1,
        dateGregorian: '2026-10-05T06:00:00.000Z',
        dateHebrew: 'י"ב תשרי תשפ"ז',
        fieldId: 2,
        updatedById: 1,
        totalHarvested: 1500,
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Harvest record created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  create(@Body() data: Prisma.FieldHarvestUncheckedCreateInput) {
    return this.harvestService.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all harvest records for a specific season' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season to filter harvests by.' })
  @ApiResponse({ status: 200, description: 'List of harvest records returned successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing seasonId query parameter.' })
  findAll(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.harvestService.findAllBySeason(seasonId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single harvest record by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the harvest record.' })
  @ApiResponse({ status: 200, description: 'Harvest record returned successfully.' })
  @ApiResponse({ status: 404, description: 'Harvest record not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.harvestService.findOne(id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Find a harvest record by field name and date' })
  @ApiQuery({ name: 'fieldName', type: String, description: 'The name of the field.' })
  @ApiQuery({ name: 'date', type: String, description: 'The harvest date in ISO format (YYYY-MM-DD).' })
  @ApiResponse({ status: 200, description: 'Matching harvest record returned.' })
  @ApiResponse({ status: 404, description: 'No harvest found for the given field and date.' })
  findByFieldNameAndDate(
    @Query('fieldName') fieldName: string,
    @Query('date') date: string,
  ) {
    return this.harvestService.findByFieldNameAndDate(fieldName, date);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing harvest record' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the harvest record to update.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        totalHarvested: { type: 'integer', example: 1630 },
        totalRejected: { type: 'integer', example: 90 },
        notes: { type: 'string', example: 'Updated after quality review' },
      },
      example: {
        totalHarvested: 1630,
        totalRejected: 90,
        notes: 'Updated after quality review',
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Harvest record updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Harvest record not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Prisma.FieldHarvestUncheckedUpdateInput,
  ) {
    return this.harvestService.update(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a harvest record by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the harvest record to delete.' })
  @ApiResponse({ status: 200, description: 'Harvest record deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Harvest record not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.harvestService.remove(id);
  }

  @Post('bulk-with-classifications')
  @ApiOperation({ summary: 'Create harvest with classifications and auto-allocate to customers/traders in single transaction' })
  @ApiBody({ type: HarvestBulkCreateDto })
  @ApiResponse({ status: 201, description: 'Harvest and classifications created with auto-allocations.' })
  @ApiResponse({ status: 400, description: 'Duplicate classifications or validation error.' })
  @ApiResponse({ status: 409, description: 'Harvest for this field and date already exists.' })
  async createBulk(@Body() bulkDto: HarvestBulkCreateDto) {
    return this.harvestBulkService.createHarvestWithClassifications(bulkDto);
  }

  @Patch(':harvestId/classifications/:classificationId')
  @ApiOperation({ summary: 'Update a classification with automatic movement reprocessing' })
  @ApiParam({ name: 'harvestId', type: Number, description: 'The numeric ID of the harvest record.' })
  @ApiParam({ name: 'classificationId', type: Number, description: 'The numeric ID of the classification to update.' })
  @ApiBody({ type: UpdateClassificationDto })
  @ApiResponse({ status: 200, description: 'Classification updated successfully. If only notes changed: simple update. Otherwise: full reprocessing with movement reversal.' })
  @ApiResponse({ status: 400, description: 'Validation error or invalid update data.' })
  @ApiResponse({ status: 404, description: 'Classification or harvest not found.' })
  async updateClassification(
    @Param('harvestId', ParseIntPipe) harvestId: number,
    @Param('classificationId', ParseIntPipe) classificationId: number,
    @Body() updateDto: UpdateClassificationDto,
  ) {
    return this.harvestBulkService.updateClassification(harvestId, classificationId, updateDto);
  }
}
