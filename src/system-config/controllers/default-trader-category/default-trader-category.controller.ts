import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/authorization/decorators/roles.decorator';
import { ActiveGuard } from 'src/authorization/guards/active.guard';
import { RolesGuard } from 'src/authorization/guards/roles.guard';
import {
  CreateDefaultTraderCategoryShareSwaggerDto,
  CreateDefaultTraderCategorySwaggerDto,
  UpdateDefaultTraderCategoryShareSwaggerDto,
  UpdateDefaultTraderCategorySwaggerDto,
} from 'src/docs/dto/swagger-enums.dto';
import { DefaultTraderCategoryService } from 'src/system-config/services/default-trader-category/default-trader-category.service';

@ApiTags('System Configuration')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@UseGuards(JwtAuthGuard, RolesGuard, ActiveGuard)
@Roles(Role.OWNER, Role.MANAGER)
@Controller('default-trader-categories')
export class DefaultTraderCategoryController {
  constructor(
    private readonly defaultTraderCategoryService: DefaultTraderCategoryService,
  ) {}

  @Get()
  async getDefaultCategories() {
    return this.defaultTraderCategoryService.findAll();
  }

  @Get(':id')
  async getDefaultCategory(@Param('id', ParseIntPipe) id: number) {
    return this.defaultTraderCategoryService.findOne(id);
  }

  @Post()
  async createDefaultCategory(@Body() dto: CreateDefaultTraderCategorySwaggerDto) {
    return this.defaultTraderCategoryService.create(dto);
  }

  @Patch(':id')
  async updateDefaultCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDefaultTraderCategorySwaggerDto,
  ) {
    return this.defaultTraderCategoryService.update(id, dto);
  }

  @Delete(':id')
  async deleteDefaultCategory(@Param('id', ParseIntPipe) id: number) {
    return this.defaultTraderCategoryService.remove(id);
  }

  @Post(':categoryId/shares')
  async addTraderShare(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() dto: CreateDefaultTraderCategoryShareSwaggerDto,
  ) {
    return this.defaultTraderCategoryService.addShare(categoryId, dto);
  }

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

  @Delete(':categoryId/shares/:traderId')
  async removeTraderShare(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('traderId', ParseIntPipe) traderId: number,
  ) {
    return this.defaultTraderCategoryService.removeShare(categoryId, traderId);
  }
}