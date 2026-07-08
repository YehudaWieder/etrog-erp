import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import {
  CreateHarvestClassificationDto,
  DeleteHarvestClassificationDto,
  FieldHarvestCreateDto,
  FieldHarvestUpdateDto,
  HarvestBulkCreateDto,
  RestoreClassificationDto,
  SortingBatchDto,
  UpdateHarvestClassificationDto,
  UpdateHarvestPartialClassificationDto,
} from 'src/harvest/services/harvest-core/dto/harvest.dto';
import { HarvestBulkService } from 'src/harvest/services/harvest-bulk.service';
import { HarvestService } from 'src/harvest/services/harvest.service';

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
  @ApiBody({ type: FieldHarvestCreateDto })
  @ApiResponse({ status: 201, description: 'Harvest record created successfully.' })
  create(@Body() data: FieldHarvestCreateDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.harvestService.create(data, actor.id);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all harvest records for a specific season' })
  @ApiQuery({ name: 'seasonId', type: Number })
  findAll(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.harvestService.findAllBySeason(seasonId);
  }

  @Get('field-totals')
  @ApiOperation({ summary: 'Retrieve per-field totals for a season with effective owner fallback and differences' })
  @ApiQuery({ name: 'seasonId', type: Number })
  findFieldTotals(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.harvestService.findFieldTotalsBySeason(seasonId);
  }

  @Get('field-details')
  @ApiOperation({ summary: 'Retrieve field report details for a specific season and field' })
  @ApiQuery({ name: 'seasonId', type: Number })
  @ApiQuery({ name: 'fieldId', type: Number })
  findFieldDetails(
    @Query('seasonId', ParseIntPipe) seasonId: number,
    @Query('fieldId', ParseIntPipe) fieldId: number,
  ) {
    return this.harvestService.findFieldReportDetailsBySeasonAndField(seasonId, fieldId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Find a harvest record by field name and date' })
  @ApiQuery({ name: 'fieldName', type: String })
  @ApiQuery({ name: 'date', type: String })
  findByFieldNameAndDate(
    @Query('fieldName') fieldName: string,
    @Query('date') date: string,
  ) {
    return this.harvestService.findByFieldNameAndDate(fieldName, date);
  }

  @Patch()
  @ApiOperation({ summary: 'Update an existing harvest record' })
  @ApiBody({ type: FieldHarvestUpdateDto })
  update(@Body() updateData: FieldHarvestUpdateDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    const { id, ...data } = updateData;
    return this.harvestService.update(id, data, actor.id);
  }

  @Patch('partial-classification')
  @ApiOperation({ summary: 'Update harvest partial/final classification mode with immediate classifiedTotal validation' })
  @ApiBody({ type: UpdateHarvestPartialClassificationDto })
  updatePartialClassificationMode(@Body() body: UpdateHarvestPartialClassificationDto) {
    return this.harvestService.updatePartialClassificationMode(body.id, body.isPartialClassification);
  }

  @Post('bulk-with-classifications')
  @ApiOperation({ summary: 'Create harvest with classifications and auto-allocate to customers/traders in single transaction' })
  @ApiBody({ type: HarvestBulkCreateDto })
  async createBulk(@Body() bulkDto: HarvestBulkCreateDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.harvestBulkService.createHarvestWithClassifications(bulkDto, actor.id);
  }

  @Post('classifications')
  @ApiOperation({ summary: 'Create a classification through harvest workflow with explicit PARTIAL/FINAL validation mode' })
  @ApiBody({ type: CreateHarvestClassificationDto })
  async createClassification(@Body() createDto: CreateHarvestClassificationDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.harvestBulkService.createClassification(createDto.harvestId, createDto, actor.id);
  }

  @Post('classifications/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted classification: atomically deletes the trash record and creates a new one' })
  @ApiBody({ type: RestoreClassificationDto })
  async restoreClassification(@Body() dto: RestoreClassificationDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.harvestBulkService.restoreClassification(dto.deletedClassificationId, dto.harvestId, dto, actor.id);
  }

  @Patch('classifications')
  @ApiOperation({ summary: 'Update a classification through harvest workflow with explicit PARTIAL/FINAL validation mode' })
  @ApiBody({ type: UpdateHarvestClassificationDto })
  async updateClassification(@Body() updateDto: UpdateHarvestClassificationDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.harvestBulkService.updateClassification(
      updateDto.harvestId,
      updateDto.classificationId,
      updateDto,
      actor.id,
    );
  }

  @Patch('classifications/batch')
  @ApiOperation({ summary: 'Edit existing classifications and create new ones on a harvest in a single transaction' })
  @ApiBody({ type: SortingBatchDto })
  async saveSortingBatch(@Body() body: SortingBatchDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.harvestBulkService.saveSortingBatch(
      body.harvestId,
      body.edits ?? [],
      body.creates ?? [],
      body.isPartialClassification,
      actor.id,
      body.harvestUpdate,
    );
  }

  @Delete('classifications')
  @ApiOperation({ summary: 'Delete a classification through harvest workflow with explicit PARTIAL/FINAL validation mode' })
  @ApiBody({ type: DeleteHarvestClassificationDto })
  async deleteClassification(@Body() body: DeleteHarvestClassificationDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.harvestBulkService.deleteClassification(body.harvestId, body.classificationId, body, actor.id);
  }

  @Delete('classifications/:id/permanent')
  @ApiOperation({ summary: 'Permanently hard-delete a soft-deleted classification record' })
  @ApiParam({ name: 'id', type: Number, description: 'The ID of the soft-deleted classification to permanently remove.' })
  @ApiResponse({ status: 200, description: 'Classification permanently deleted.' })
  @ApiResponse({ status: 404, description: 'Soft-deleted classification not found.' })
  async permanentDeleteClassification(@Param('id', ParseIntPipe) id: number) {
    return this.harvestBulkService.permanentDeleteClassification(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single harvest record by ID' })
  @ApiParam({ name: 'id', type: Number })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.harvestService.findOne(id);
  }

  @Delete(':id/sortings')
  @ApiOperation({ summary: 'Delete all sorting classifications for a harvest record' })
  @ApiParam({ name: 'id', type: Number })
  removeAllSortings(@Param('id', ParseIntPipe) id: number) {
    return this.harvestService.removeAllSortings(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a harvest record by ID' })
  @ApiParam({ name: 'id', type: Number })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.harvestService.remove(id);
  }
}
