// src/harvest/harvest.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { HarvestService } from './harvest.service';
import { HarvestBulkService } from './harvest-bulk.service';
import { Prisma } from '@prisma/client';
import {
  HarvestBulkCreateDto,
  CreateHarvestClassificationDto,
  UpdateHarvestClassificationDto,
  DeleteHarvestClassificationDto,
  UpdateHarvestPartialClassificationDto,
} from 'src/docs/dto/swagger-enums.dto';

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

  @Patch(':id/partial-classification')
  @ApiOperation({ summary: 'Update harvest partial/final classification mode with immediate classifiedTotal validation' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the harvest record.' })
  @ApiBody({
    type: UpdateHarvestPartialClassificationDto,
    examples: {
      partial: {
        summary: 'Keep harvest in partial mode',
        value: {
          isPartialClassification: true,
        },
      },
      final: {
        summary: 'Close harvest in final mode',
        value: {
          isPartialClassification: false,
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Harvest classification mode updated successfully.' })
  @ApiResponse({ status: 400, description: 'Cannot switch to FINAL mode while classifiedTotal does not match net harvested.' })
  @ApiResponse({ status: 404, description: 'Harvest record not found.' })
  updatePartialClassificationMode(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateHarvestPartialClassificationDto,
  ) {
    return this.harvestService.updatePartialClassificationMode(id, body.isPartialClassification);
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
  @ApiBody({
    type: HarvestBulkCreateDto,
    examples: {
      sampleAllAssignmentTypes: {
        summary: 'Single bulk object with all 3 assignment types: TRADER + GENERAL + CUSTOMER',
        value: {
          dateGregorian: '2026-10-15T06:00:00.000Z',
          dateHebrew: 'כ"ג תשרי תשפ"ז',
          fieldId: 2,
          updatedById: 1,
          totalHarvested: 2000,
          totalRejected: 100,
          ownerHarvested: 0,
          ownerRejected: 0,
          notes: 'קטיף בוקר - דוגמה מאוחדת לכל 3 סוגי המיון',
          isPartialClassification: true,
          classifications: [
            {
              assignmentType: 'TRADER',
              traderId: 3,
              traderCategoryId: 7,
              grade: 'א',
              pitamStatus: 'WITH_PITAM',
              quantity: 620,
              notes: 'בומבעס - אתרוגים גדולים מאוד וידר-בייטש',
            },
            {
              assignmentType: 'GENERAL',
              traderCategoryId: 4,
              grade: 'ב',
              pitamStatus: 'WITHOUT_PITAM',
              quantity: 800,
              notes: 'יאנעווע - חלוקה לפי אחוזי סוחרים',
            },
            {
              assignmentType: 'CUSTOMER',
              customerId: 1,
              customerCategoryId: 3,
              pitamStatus: 'WITH_PITAM',
              quantity: 480,
              notes: 'חבד קלר + דרגה א - (categoryId=3)',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Harvest and classifications created with auto-allocations.' })
  @ApiResponse({ status: 400, description: 'Duplicate classifications or validation error.' })
  @ApiResponse({ status: 409, description: 'Harvest for this field and date already exists.' })
  async createBulk(@Body() bulkDto: HarvestBulkCreateDto) {
    return this.harvestBulkService.createHarvestWithClassifications(bulkDto);
  }

  @Post(':harvestId/classifications')
  @ApiOperation({ summary: 'Create a classification through harvest workflow with explicit PARTIAL/FINAL validation mode' })
  @ApiParam({ name: 'harvestId', type: Number, description: 'The numeric ID of the harvest record.' })
  @ApiBody({
    type: CreateHarvestClassificationDto,
    examples: {
      customerCategoryRealSample: {
        summary: 'Create CUSTOMER classification using customerCategoryId (name+grade)',
        value: {
          assignmentType: 'CUSTOMER',
          customerId: 1,
          customerCategoryId: 3,
          pitamStatus: 'WITH_PITAM',
          quantity: 120,
          notes: 'חבד קלר + דרגה א - (categoryId=3)',
          updatedById: 1,
          validationMode: 'PARTIAL',
          harvestUpdate: {
            totalHarvested: 1520,
            totalRejected: 80,
            notes: 'תיקון קל אחרי מיון',
            updatedById: 1,
          },
        },
      },
      traderCategoryRealSample: {
        summary: 'Create TRADER classification using trader category',
        value: {
          assignmentType: 'TRADER',
          traderId: 4,
          traderCategoryId: 6,
          grade: 'ב',
          pitamStatus: 'WITHOUT_PITAM',
          quantity: 200,
          notes: 'חב\'\'ד - קטיף ערב',
          updatedById: 1,
          validationMode: 'PARTIAL',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Classification created and allocations processed successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error for classification consistency or allocation data.' })
  @ApiResponse({ status: 404, description: 'Harvest not found.' })
  async createClassification(
    @Param('harvestId', ParseIntPipe) harvestId: number,
    @Body() createDto: CreateHarvestClassificationDto,
  ) {
    return this.harvestBulkService.createClassification(harvestId, createDto);
  }

  @Patch(':harvestId/classifications/:classificationId')
  @ApiOperation({ summary: 'Update a classification through harvest workflow with explicit PARTIAL/FINAL validation mode' })
  @ApiParam({ name: 'harvestId', type: Number, description: 'The numeric ID of the harvest record.' })
  @ApiParam({ name: 'classificationId', type: Number, description: 'The numeric ID of the classification to update.' })
  @ApiBody({
    type: UpdateHarvestClassificationDto,
    examples: {
      sampleQuantityFix: {
        summary: 'Update classification quantity/notes with real-world values',
        value: {
          quantity: 140,
          notes: 'עודכן אחרי תיקון מיון',
          updatedById: 1,
          validationMode: 'PARTIAL',
          harvestUpdate: {
            notes: 'עודכן במקביל לרשומת המיון',
            updatedById: 1,
          },
        },
      },
      sampleMoveToDifferentCustomerCategory: {
        summary: 'Move classification to another customer category (name+grade combo)',
        value: {
          assignmentType: 'CUSTOMER',
          customerId: 3,
          customerCategoryId: 8,
          pitamStatus: 'WITH_PITAM',
          quantity: 90,
          notes: 'חזוא איידלמן + דרגה ב (categoryId=8)',
          updatedById: 1,
          validationMode: 'PARTIAL',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Classification updated successfully with movement reprocessing when required.' })
  @ApiResponse({ status: 400, description: 'Validation error or invalid update data.' })
  @ApiResponse({ status: 404, description: 'Classification or harvest not found.' })
  async updateClassification(
    @Param('harvestId', ParseIntPipe) harvestId: number,
    @Param('classificationId', ParseIntPipe) classificationId: number,
    @Body() updateDto: UpdateHarvestClassificationDto,
  ) {
    return this.harvestBulkService.updateClassification(harvestId, classificationId, updateDto);
  }

  @Delete(':harvestId/classifications/:classificationId')
  @ApiOperation({ summary: 'Delete a classification through harvest workflow with explicit PARTIAL/FINAL validation mode' })
  @ApiParam({ name: 'harvestId', type: Number, description: 'The numeric ID of the harvest record.' })
  @ApiParam({ name: 'classificationId', type: Number, description: 'The numeric ID of the classification to delete.' })
  @ApiBody({
    type: DeleteHarvestClassificationDto,
    examples: {
      sample: {
        summary: 'Delete classification while preserving PARTIAL mode',
        value: {
          validationMode: 'PARTIAL',
          harvestUpdate: {
            notes: 'מחיקת רשומה כפולה',
            updatedById: 1,
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Classification deleted and movements rolled back successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error for FINAL mode or invalid classification linkage.' })
  @ApiResponse({ status: 404, description: 'Classification or harvest not found.' })
  async deleteClassification(
    @Param('harvestId', ParseIntPipe) harvestId: number,
    @Param('classificationId', ParseIntPipe) classificationId: number,
    @Body() body: DeleteHarvestClassificationDto,
  ) {
    return this.harvestBulkService.deleteClassification(harvestId, classificationId, body);
  }
}
