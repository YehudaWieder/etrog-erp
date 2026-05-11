import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../authorization/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { DefaultTraderCategoryService } from './services/default-trader-category/default-trader-category.service';
import {
  CreateDefaultTraderCategorySwaggerDto,
  UpdateDefaultTraderCategorySwaggerDto,
  CreateDefaultTraderCategoryShareSwaggerDto,
  UpdateDefaultTraderCategoryShareSwaggerDto,
} from '../docs/dto/swagger-enums.dto';

@ApiTags('System Configuration')
@Controller('default-trader-categories')
@UseGuards(JwtAuthGuard)
@Roles(Role.OWNER, Role.MANAGER)
export class ConfigController {
  constructor(
    private defaultTraderCategoryService: DefaultTraderCategoryService,
  ) {}

  // =========================================================================
  // Default Trader Categories (Global System Settings)
  // =========================================================================

  /**
   * Get all default trader categories with their shares
   * GET /default-trader-categories
   */
  @Get()
  async getDefaultCategories() {
    return this.defaultTraderCategoryService.findAll();
  }

  /**
   * Get a specific default trader category
   * GET /default-trader-categories/:id
   */
  @Get(':id')
  async getDefaultCategory(@Param('id', ParseIntPipe) id: number) {
    return this.defaultTraderCategoryService.findOne(id);
  }

  /**
   * Create a new default trader category
   * POST /default-trader-categories
   */
  @Post()
  async createDefaultCategory(@Body() dto: CreateDefaultTraderCategorySwaggerDto) {
    return this.defaultTraderCategoryService.create(dto);
  }

  /**
   * Update a default trader category
   * PATCH /default-trader-categories/:id
   */
  @Patch(':id')
  async updateDefaultCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDefaultTraderCategorySwaggerDto,
  ) {
    return this.defaultTraderCategoryService.update(id, dto);
  }

  /**
   * Delete a default trader category and its shares
   * DELETE /default-trader-categories/:id
   */
  @Delete(':id')
  async deleteDefaultCategory(@Param('id', ParseIntPipe) id: number) {
    return this.defaultTraderCategoryService.remove(id);
  }

  // =========================================================================
  // Default Trader Category Shares
  // =========================================================================

  /**
   * Add a trader share to a default category
   * POST /default-trader-categories/:categoryId/shares
   */
  @Post(':categoryId/shares')
  async addTraderShare(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() dto: CreateDefaultTraderCategoryShareSwaggerDto,
  ) {
    return this.defaultTraderCategoryService.addShare(categoryId, dto);
  }

  /**
   * Update a trader share percentage
   * PATCH /default-trader-categories/:categoryId/shares/:traderId
   */
  @Patch(':categoryId/shares/:traderId')
  async updateTraderShare(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('traderId', ParseIntPipe) traderId: number,
    @Body() dto: UpdateDefaultTraderCategoryShareSwaggerDto,
  ) {
    return this.defaultTraderCategoryService.updateShare(
      categoryId,
      traderId,
      dto.percent,
    );
  }

  /**
   * Remove a trader share from a default category
   * DELETE /default-trader-categories/:categoryId/shares/:traderId
   */
  @Delete(':categoryId/shares/:traderId')
  async removeTraderShare(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('traderId', ParseIntPipe) traderId: number,
  ) {
    return this.defaultTraderCategoryService.removeShare(categoryId, traderId);
  }
}