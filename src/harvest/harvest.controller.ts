// src/harvest/harvest.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { HarvestService } from './harvest.service';
import { HarvestBulkService } from './harvest-bulk.service';
import { Prisma } from '@prisma/client';
import {
  HarvestBulkCreateDto,
  CreateHarvestClassificationDto,
  UpdateHarvestClassificationDto,
  DeleteHarvestClassificationDto,
  UpdateHarvestPartialClassificationDto,
  FieldHarvestUpdateSwaggerDto,
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
      required: ['dateGregorian', 'dateHebrew', 'fieldId'],
      properties: {
        dateGregorian: { type: 'string', format: 'date-time', example: '2026-10-05T06:00:00.000Z' },
        dateHebrew: { type: 'string', example: 'י"ב תשרי תשפ"ז' },
        fieldId: { type: 'integer', example: 2 },
        totalHarvested: { type: 'integer', example: 1500 },
        totalRejected: { type: 'integer', example: 0 },
        notes: { type: 'string', example: 'Field 2 harvest' },
      },
      example: {
        dateGregorian: '2026-10-05T06:00:00.000Z',
        dateHebrew: 'י"ב תשרי תשפ"ז',
        fieldId: 2,
        totalHarvested: 1500,
        notes: 'Field 2 harvest',
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Harvest record created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  create(@Body() data: Prisma.FieldHarvestUncheckedCreateInput, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.harvestService.create(data, actor.id);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all harvest records for a specific season' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season to filter harvests by.' })
  @ApiResponse({ status: 200, description: 'List of harvest records returned successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing seasonId query parameter.' })
  findAll(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.harvestService.findAllBySeason(seasonId);
  }

  @Get('field-totals')
  @ApiOperation({ summary: 'Retrieve per-field totals for a season with effective owner fallback and differences' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season to aggregate by.' })
  @ApiResponse({ status: 200, description: 'Per-field totals returned successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing seasonId query parameter.' })
  findFieldTotals(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.harvestService.findFieldTotalsBySeason(seasonId);
  }

  @Get('field-details')
  @ApiOperation({ summary: 'Retrieve field report details for a specific season and field' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season to filter by.' })
  @ApiQuery({ name: 'fieldId', type: Number, description: 'The ID of the field to load details for.' })
  @ApiResponse({ status: 200, description: 'Field report details returned successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing seasonId/fieldId query parameter.' })
  @ApiResponse({ status: 404, description: 'No field records found for the selected season and field.' })
  findFieldDetails(
    @Query('seasonId', ParseIntPipe) seasonId: number,
    @Query('fieldId', ParseIntPipe) fieldId: number,
  ) {
    return this.harvestService.findFieldReportDetailsBySeasonAndField(seasonId, fieldId);
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

  @Patch()
  @ApiOperation({ summary: 'Update an existing harvest record' })
  @ApiBody({
    type: FieldHarvestUpdateSwaggerDto,
    examples: {
      sample: {
        summary: 'Update harvest totals and notes',
        value: {
          id: 1,
          totalHarvested: 1630,
          totalRejected: 90,
          notes: 'Updated after quality review',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Harvest record updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Harvest record not found.' })
  update(
    @Body() updateData: FieldHarvestUpdateSwaggerDto,
    @Req() req: Request,
  ) {
    const actor = req.user as AuthenticatedUser;
    const { id, ...data } = updateData;
    return this.harvestService.update(id, data as Prisma.FieldHarvestUncheckedUpdateInput, actor.id);
  }

  @Patch('partial-classification')
  @ApiOperation({ summary: 'Update harvest partial/final classification mode with immediate classifiedTotal validation' })
  @ApiBody({
    type: UpdateHarvestPartialClassificationDto,
    examples: {
      partial: {
        summary: 'Keep harvest in partial mode',
        value: {
          id: 1,
          isPartialClassification: true,
        },
      },
      final: {
        summary: 'Close harvest in final mode',
        value: {
          id: 1,
          isPartialClassification: false,
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Harvest classification mode updated successfully.' })
  @ApiResponse({ status: 400, description: 'Cannot switch to FINAL mode while classifiedTotal does not match net harvested.' })
  @ApiResponse({ status: 404, description: 'Harvest record not found.' })
  updatePartialClassificationMode(
    @Body() body: UpdateHarvestPartialClassificationDto,
  ) {
    return this.harvestService.updatePartialClassificationMode(body.id, body.isPartialClassification);
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
  async createBulk(@Body() bulkDto: HarvestBulkCreateDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.harvestBulkService.createHarvestWithClassifications(bulkDto, actor.id);
  }

  @Post('classifications')
  @ApiOperation({ summary: 'Create a classification through harvest workflow with explicit PARTIAL/FINAL validation mode' })
  @ApiBody({
    type: CreateHarvestClassificationDto,
    examples: {
      customerCategoryRealSample: {
        summary: 'Create CUSTOMER classification using customerCategoryId (name+grade)',
        value: {
          harvestId: 1,
          assignmentType: 'CUSTOMER',
          customerId: 1,
          customerCategoryId: 3,
          pitamStatus: 'WITH_PITAM',
          quantity: 120,
          notes: 'חבד קלר + דרגה א - (categoryId=3)',
          isPartialClassification: true,
          harvestUpdate: {
            totalHarvested: 1520,
            totalRejected: 80,
            notes: 'תיקון קל אחרי מיון',
          },
        },
      },
      traderCategoryRealSample: {
        summary: 'Create TRADER classification using trader category',
        value: {
          harvestId: 1,
          assignmentType: 'TRADER',
          traderId: 4,
          traderCategoryId: 6,
          grade: 'ב',
          pitamStatus: 'WITHOUT_PITAM',
          quantity: 200,
          notes: 'חב\'\'ד - קטיף ערב',
          isPartialClassification: true,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Classification created and allocations processed successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error for classification consistency or allocation data.' })
  @ApiResponse({ status: 404, description: 'Harvest not found.' })
  async createClassification(
    @Body() createDto: CreateHarvestClassificationDto,
    @Req() req: Request,
  ) {
    const actor = req.user as AuthenticatedUser;
    return this.harvestBulkService.createClassification(createDto.harvestId, createDto, actor.id);
  }

  @Patch('classifications')
  @ApiOperation({ summary: 'Update a classification through harvest workflow with explicit PARTIAL/FINAL validation mode' })
  @ApiBody({
    type: UpdateHarvestClassificationDto,
    examples: {
      sampleQuantityFix: {
        summary: 'Update classification quantity/notes with real-world values',
        value: {
          harvestId: 1,
          classificationId: 5,
          quantity: 140,
          notes: 'עודכן אחרי תיקון מיון',
          isPartialClassification: true,
          harvestUpdate: {
            notes: 'עודכן במקביל לרשומת המיון',
          },
        },
      },
      sampleMoveToDifferentCustomerCategory: {
        summary: 'Move classification to another customer category (name+grade combo)',
        value: {
          harvestId: 1,
          classificationId: 5,
          assignmentType: 'CUSTOMER',
          customerId: 3,
          customerCategoryId: 8,
          pitamStatus: 'WITH_PITAM',
          quantity: 90,
          notes: 'חזוא איידלמן + דרגה ב (categoryId=8)',
          isPartialClassification: true,
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Classification updated successfully with movement reprocessing when required.' })
  @ApiResponse({ status: 400, description: 'Validation error or invalid update data.' })
  @ApiResponse({ status: 404, description: 'Classification or harvest not found.' })
  async updateClassification(
    @Body() updateDto: UpdateHarvestClassificationDto,
    @Req() req: Request,
  ) {
    const actor = req.user as AuthenticatedUser;
    return this.harvestBulkService.updateClassification(updateDto.harvestId, updateDto.classificationId, updateDto, actor.id);
  }

  @Delete('classifications')
  @ApiOperation({ summary: 'Delete a classification through harvest workflow with explicit PARTIAL/FINAL validation mode' })
  @ApiBody({
    type: DeleteHarvestClassificationDto,
    examples: {
      sample: {
        summary: 'Delete classification while preserving PARTIAL mode',
        value: {
          harvestId: 1,
          classificationId: 5,
          isPartialClassification: true,
          harvestUpdate: {
            notes: 'מחיקת רשומה כפולה',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Classification deleted and movements rolled back successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error for FINAL mode or invalid classification linkage.' })
  @ApiResponse({ status: 404, description: 'Classification or harvest not found.' })
  async deleteClassification(
    @Body() body: DeleteHarvestClassificationDto,
    @Req() req: Request,
  ) {
    const actor = req.user as AuthenticatedUser;
    return this.harvestBulkService.deleteClassification(body.harvestId, body.classificationId, body, actor.id);
  }
}
