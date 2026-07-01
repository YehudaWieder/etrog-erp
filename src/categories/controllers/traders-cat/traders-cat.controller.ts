// src/categories/controllers/traders-cat/traders-cat.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { TradersCatService } from '../../services/traders-cat/traders-cat.service';
import { TraderCatShareService } from '../../services/traders-cat-share/traders-cat-share.service';
import { Grade, Role } from '@prisma/client';
import { Roles } from 'src/authorization/decorators/roles.decorator';
import type { Request } from 'express';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { CreateTraderCategoryDto } from 'src/categories/services/traders-cat/dto/create-trader-category.dto';
import { UpdateTraderCategoryDto } from 'src/categories/services/traders-cat/dto/update-trader-category.dto';
import { CreateTraderCategoryWithSharesDto } from 'src/categories/services/traders-cat-share/dto/create-trader-category-with-shares.dto';
import { UpdateTraderCategoryWithSharesDto } from 'src/categories/services/traders-cat-share/dto/update-trader-category-with-shares.dto';
import { ReorderTraderCategoriesDto } from 'src/categories/services/traders-cat/dto/reorder-trader-categories.dto';

@ApiTags('Categories')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Roles(Role.OWNER, Role.MANAGER)
@Controller('traders-categories')
export class TradersCatController {
  constructor(
    private readonly tradersCatService: TradersCatService,
    private readonly traderCatShareService: TraderCatShareService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new trader category for the active season. Unique constraint: [name, seasonId].' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', description: 'The category name (e.g., "Yanover").', example: 'Yanover Premium' },
        notes: { type: 'string', description: 'Optional notes about the category.', nullable: true, example: 'Large-size export category' },
        supportedGrades: {
          type: 'array',
          items: { type: 'string', enum: Object.values(Grade) },
          description: 'Grades supported by this category.',
          example: [Grade.א, Grade.ב],
        },
      },
      example: {
        name: 'Yanover Premium',
        notes: 'Large-size export category',
        supportedGrades: [Grade.א, Grade.ב],
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Trader category created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate category name within the season.' })
  create(@Body() dto: CreateTraderCategoryDto) {
    return this.tradersCatService.create(dto);
  }

  @Post('with-shares')
  @ApiOperation({ summary: 'Create a trader category for a selected season with full trader distribution (total must equal 100%).' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['seasonId', 'name', 'shares'],
      properties: {
        seasonId: { type: 'number', example: 1 },
        name: { type: 'string', example: 'Yanover Premium' },
        notes: { type: 'string', nullable: true, example: 'Large-size export category' },
        supportedGrades: {
          type: 'array',
          items: { type: 'string', enum: Object.values(Grade) },
          description: 'Grades supported by this category.',
          example: [Grade.א, Grade.ב],
        },
        shares: {
          type: 'array',
          items: {
            type: 'object',
            required: ['traderId', 'percent'],
            properties: {
              traderId: { type: 'number', example: 3 },
              percent: { type: 'number', example: 35.5 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Trader category with shares created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid category or shares payload.' })
  @ApiResponse({ status: 404, description: 'Season or one or more traders not found.' })
  @ApiResponse({ status: 409, description: 'Category already exists in this season.' })
  createWithShares(@Body() dto: CreateTraderCategoryWithSharesDto) {
    return this.traderCatShareService.createWithShares(dto);
  }

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({ summary: 'Retrieve all trader categories for a specific season' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season to filter categories by.' })
  @ApiResponse({ status: 200, description: 'List of trader categories returned successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing seasonId query parameter.' })
  findAll(@Query('seasonId', ParseIntPipe) seasonId: number, @Req() req: Request) {
    return this.tradersCatService.findAllBySeason(seasonId, req.user as AuthenticatedUser);
  }

  @Get('with-shares')
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({ summary: 'Retrieve trader categories with full shares for a selected season.' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The season ID to load category shares from.' })
  @ApiResponse({ status: 200, description: 'Trader categories with shares returned successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing seasonId query parameter.' })
  findAllWithShares(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.traderCatShareService.findAllWithSharesBySeason(seasonId);
  }

  @Get('by-name')
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
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
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({ summary: 'Retrieve a single trader category by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the trader category.' })
  @ApiResponse({ status: 200, description: 'Trader category returned successfully.' })
  @ApiResponse({ status: 404, description: 'Trader category not found.' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.tradersCatService.findOne(id, req.user as AuthenticatedUser);
  }

  @Patch()
  @ApiOperation({ summary: 'Update a trader category by ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'number', example: 1 },
        name: { type: 'string', example: 'Yanover Premium Updated' },
        notes: { type: 'string', nullable: true, example: 'Adjusted classification notes' },
        supportedGrades: {
          type: 'array',
          items: { type: 'string', enum: Object.values(Grade) },
          description: 'Updated list of grades supported by this category.',
          example: [Grade.א, Grade.ב, Grade.ג],
        },
      },
    },
    examples: {
      sample: {
        summary: 'Update a trader category by ID',
        value: {
          id: 1,
          name: 'Yanover Premium Updated',
          notes: 'Adjusted classification notes',
          supportedGrades: [Grade.א, Grade.ב, Grade.ג],
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Trader category updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Trader category not found.' })
  update(@Body() updateData: UpdateTraderCategoryDto) {
    const { id, ...data } = updateData;
    return this.tradersCatService.update(id, data);
  }

  @Patch('with-shares')
  @ApiOperation({ summary: 'Update trader category details and replace full trader distribution (total must equal 100%).' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['id', 'shares'],
      properties: {
        id: { type: 'number', example: 1 },
        name: { type: 'string', example: 'Yanover Premium Updated' },
        notes: { type: 'string', nullable: true, example: 'Adjusted notes' },
        supportedGrades: {
          type: 'array',
          items: { type: 'string', enum: Object.values(Grade) },
          description: 'Updated list of grades supported by this category.',
          example: [Grade.א, Grade.ב, Grade.ג],
        },
        shares: {
          type: 'array',
          items: {
            type: 'object',
            required: ['traderId', 'percent'],
            properties: {
              traderId: { type: 'number', example: 3 },
              percent: { type: 'number', example: 42 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Trader category with shares updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid category or shares payload.' })
  @ApiResponse({ status: 404, description: 'Category or one or more traders not found.' })
  @ApiResponse({ status: 409, description: 'Category already exists in this season.' })
  updateWithShares(@Body() dto: UpdateTraderCategoryWithSharesDto) {
    return this.traderCatShareService.updateWithShares(dto);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Persist a manual priority order for all trader categories in a season.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['seasonId', 'orderedIds'],
      properties: {
        seasonId: { type: 'number', example: 1 },
        orderedIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Category IDs for this season in the desired display order.',
          example: [4, 2, 1, 3],
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Categories reordered successfully.' })
  @ApiResponse({ status: 400, description: 'orderedIds does not match the categories in this season.' })
  reorder(@Body() dto: ReorderTraderCategoriesDto) {
    return this.tradersCatService.reorder(dto);
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
