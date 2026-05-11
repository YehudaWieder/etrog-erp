import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../authorization/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { DefaultTraderCategoryService } from './services/default-trader-category/default-trader-category.service';
import {
  CreateDefaultTraderCategoryDto,
  UpdateDefaultTraderCategoryDto,
  CreateDefaultTraderCategoryShareDto,
  UpdateDefaultTraderCategoryShareDto,
} from './services/default-trader-category/dto';

@ApiTags('System Configuration')
@Controller('system-config')
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
   * GET /system-config/default-trader-categories
   */
  @Get('default-trader-categories')
  async getDefaultCategories() {
    return this.defaultTraderCategoryService.findAll();
  }

  /**
   * Get a specific default trader category
   * GET /system-config/default-trader-categories/:id
   */
  @Get('default-trader-categories/:id')
  async getDefaultCategory(@Param('id', ParseIntPipe) id: number) {
    return this.defaultTraderCategoryService.findOne(id);
  }

  /**
   * Create a new default trader category
   * POST /system-config/default-trader-categories
   */
  @Post('default-trader-categories')
  async createDefaultCategory(@Body() dto: CreateDefaultTraderCategoryDto) {
    return this.defaultTraderCategoryService.create(dto);
  }

  /**
   * Update a default trader category
   * PATCH /system-config/default-trader-categories/:id
   */
  @Patch('default-trader-categories/:id')
  async updateDefaultCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDefaultTraderCategoryDto,
  ) {
    return this.defaultTraderCategoryService.update(id, dto);
  }

  /**
   * Delete a default trader category and its shares
   * DELETE /system-config/default-trader-categories/:id
   */
  @Delete('default-trader-categories/:id')
  async deleteDefaultCategory(@Param('id', ParseIntPipe) id: number) {
    return this.defaultTraderCategoryService.remove(id);
  }

  // =========================================================================
  // Default Trader Category Shares
  // =========================================================================

  /**
   * Add a trader share to a default category
   * POST /system-config/default-trader-categories/:categoryId/shares
   */
  @Post('default-trader-categories/:categoryId/shares')
  async addTraderShare(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() dto: CreateDefaultTraderCategoryShareDto,
  ) {
    return this.defaultTraderCategoryService.addShare(categoryId, dto);
  }

  /**
   * Update a trader share percentage
   * PATCH /system-config/default-trader-categories/:categoryId/shares/:traderId
   */
  @Patch('default-trader-categories/:categoryId/shares/:traderId')
  async updateTraderShare(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('traderId', ParseIntPipe) traderId: number,
    @Body() dto: UpdateDefaultTraderCategoryShareDto,
  ) {
    return this.defaultTraderCategoryService.updateShare(
      categoryId,
      traderId,
      dto.percent,
    );
  }

  /**
   * Remove a trader share from a default category
   * DELETE /system-config/default-trader-categories/:categoryId/shares/:traderId
   */
  @Delete('default-trader-categories/:categoryId/shares/:traderId')
  async removeTraderShare(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('traderId', ParseIntPipe) traderId: number,
  ) {
    return this.defaultTraderCategoryService.removeShare(categoryId, traderId);
  }
}