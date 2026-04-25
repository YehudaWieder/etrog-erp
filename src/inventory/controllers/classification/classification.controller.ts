// src/inventory/controllers/classification/classification.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { ClassificationService } from '../../services/classification/classification.service';
import { Prisma } from '@prisma/client';
import { ClassificationSwaggerDto } from 'src/docs/dto/swagger-enums.dto';

@ApiTags('Inventory')
@ApiBearerAuth('access-token')
@Controller('classifications')
export class ClassificationController {
  constructor(private readonly classificationService: ClassificationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new grading classification record for a harvest. Unique constraint: [fieldHarvestId, traderCategoryId, customerCategoryId, grade, assignmentType].' })
  @ApiBody({
    type: ClassificationSwaggerDto,
    examples: {
      sample: {
        summary: 'Sample classification create payload',
        value: {
          seasonId: 1,
          fieldHarvestId: 10,
          updatedById: 1,
          assignmentType: 'TRADER',
          traderId: 3,
          traderCategoryId: 2,
          grade: 'א',
          pitamStatus: 'WITH_PITAM',
          quantity: 120,
          notes: 'First sorting batch',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Classification record created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate classification for this harvest.' })
  create(@Body() data: Prisma.ClassificationUncheckedCreateInput) {
    return this.classificationService.create(data);
  }

  @Get('harvest/:harvestId')
  @ApiOperation({ summary: 'Retrieve all classification records for a specific field harvest' })
  @ApiParam({ name: 'harvestId', type: Number, description: 'The ID of the field harvest.' })
  @ApiResponse({ status: 200, description: 'List of classifications for the harvest returned.' })
  @ApiResponse({ status: 404, description: 'Field harvest not found.' })
  findByHarvest(@Param('harvestId', ParseIntPipe) harvestId: number) {
    return this.classificationService.findByHarvest(harvestId);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all classification records for a specific season' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season to filter classifications by.' })
  @ApiResponse({ status: 200, description: 'List of classifications returned successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing seasonId query parameter.' })
  findAll(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.classificationService.findAllBySeason(seasonId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing classification record by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the classification to update.' })
  @ApiBody({
    type: ClassificationSwaggerDto,
    examples: {
      sample: {
        summary: 'Sample classification update payload',
        value: {
          quantity: 140,
          notes: 'Adjusted after recount',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Classification updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Classification not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Prisma.ClassificationUncheckedUpdateInput,
  ) {
    return this.classificationService.update(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a classification record by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the classification to delete.' })
  @ApiResponse({ status: 200, description: 'Classification deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Classification not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.classificationService.remove(id);
  }
}