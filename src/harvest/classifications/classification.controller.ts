import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ClassificationService } from './classification.service';

@ApiTags('Operations')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Controller('classifications')
export class ClassificationController {
  constructor(private readonly classificationService: ClassificationService) {}

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

  @Get('daily-summary')
  @ApiOperation({ summary: 'Retrieve sorting daily summary rows by season (grouped by harvest day and field)' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season to summarize.' })
  @ApiResponse({ status: 200, description: 'Daily sorting summary returned successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing seasonId query parameter.' })
  findDailySummary(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.classificationService.findDailySummaryBySeason(seasonId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single classification record by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the classification record.' })
  @ApiResponse({ status: 200, description: 'Classification record returned successfully.' })
  @ApiResponse({ status: 404, description: 'Classification record not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.classificationService.findOne(id);
  }
}