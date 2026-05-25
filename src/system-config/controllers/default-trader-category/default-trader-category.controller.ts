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
  ApiBody,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
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
  CreateDefaultTraderCategoryWithSharesSwaggerDto,
  UpdateDefaultTraderCategoryShareSwaggerDto,
  UpdateDefaultTraderCategorySwaggerDto,
  DefaultTraderCategoryApprovalResponseSwaggerDto,
} from 'src/docs/dto/swagger-enums.dto';
import { DefaultTraderCategoryService } from 'src/system-config/services/default-trader-category/default-trader-category.service';

@ApiTags('System Configuration')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@UseGuards(JwtAuthGuard, RolesGuard, ActiveGuard)
@Controller('default-trader-categories')
export class DefaultTraderCategoryController {
  constructor(
    private readonly defaultTraderCategoryService: DefaultTraderCategoryService,
  ) {}

  @ApiOperation({ summary: 'Get all default trader categories with their shares for approval display. Roles: OWNER, MANAGER, EDITOR.' })
  @ApiResponse({
    status: 200,
    description: 'Default trader categories with complete share breakdown returned successfully.',
    type: [DefaultTraderCategoryApprovalResponseSwaggerDto],
  })
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @Get()
  async getDefaultCategories() {
    return this.defaultTraderCategoryService.findAll();
  }

  @ApiOperation({ summary: 'Get one default trader category by ID with all trader shares and total. Roles: OWNER, MANAGER, EDITOR.' })
  @ApiParam({ name: 'id', type: Number, description: 'Default trader category ID.' })
  @ApiResponse({
    status: 200,
    description: 'Default trader category with complete share breakdown returned successfully.',
    type: DefaultTraderCategoryApprovalResponseSwaggerDto,
  })
  @ApiResponse({ status: 404, description: 'Default trader category not found.' })
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @Get(':id')
  async getDefaultCategory(@Param('id', ParseIntPipe) id: number) {
    return this.defaultTraderCategoryService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new default trader category. Roles: OWNER, MANAGER.' })
  @ApiBody({ type: CreateDefaultTraderCategorySwaggerDto })
  @ApiResponse({ status: 201, description: 'Default trader category created successfully.' })
  @ApiResponse({ status: 409, description: 'Category name already exists.' })
  @Roles(Role.OWNER, Role.MANAGER)
  @Post()
  async createDefaultCategory(@Body() dto: CreateDefaultTraderCategorySwaggerDto) {
    return this.defaultTraderCategoryService.create(dto);
  }

  @ApiOperation({ summary: 'Create a new default trader category with full trader share distribution. Roles: OWNER, MANAGER.' })
  @ApiBody({ type: CreateDefaultTraderCategoryWithSharesSwaggerDto })
  @ApiResponse({
    status: 201,
    description: 'Default trader category with shares created successfully.',
    type: DefaultTraderCategoryApprovalResponseSwaggerDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid shares payload or total percent is not exactly 100.' })
  @ApiResponse({ status: 404, description: 'One or more traders were not found.' })
  @ApiResponse({ status: 409, description: 'Category name already exists.' })
  @Roles(Role.OWNER, Role.MANAGER)
  @Post('with-shares')
  async createDefaultCategoryWithShares(@Body() dto: CreateDefaultTraderCategoryWithSharesSwaggerDto) {
    return this.defaultTraderCategoryService.createWithShares(dto);
  }

  @ApiOperation({ summary: 'Update a default trader category. Roles: OWNER, MANAGER.' })
  @ApiBody({ type: UpdateDefaultTraderCategorySwaggerDto })
  @ApiResponse({
    status: 200,
    description: 'Default trader category updated successfully.',
    type: DefaultTraderCategoryApprovalResponseSwaggerDto,
  })
  @ApiResponse({ status: 404, description: 'Default trader category not found.' })
  @Roles(Role.OWNER, Role.MANAGER)
  @Patch()
  async updateDefaultCategory(@Body() dto: UpdateDefaultTraderCategorySwaggerDto) {
    return this.defaultTraderCategoryService.update(dto.id, dto);
  }

  @ApiOperation({ summary: 'Delete a default trader category and its default shares. Roles: OWNER, MANAGER.' })
  @ApiParam({ name: 'id', type: Number, description: 'Default trader category ID.' })
  @ApiResponse({ status: 200, description: 'Default trader category deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Default trader category not found.' })
  @Roles(Role.OWNER, Role.MANAGER)
  @Delete(':id')
  async deleteDefaultCategory(@Param('id', ParseIntPipe) id: number) {
    return this.defaultTraderCategoryService.remove(id);
  }

  @ApiOperation({ summary: 'Add a trader share to a default trader category. Roles: OWNER, MANAGER.' })
  @ApiBody({ type: CreateDefaultTraderCategoryShareSwaggerDto })
  @ApiResponse({ status: 201, description: 'Default share created successfully.' })
  @ApiResponse({ status: 404, description: 'Category or trader not found.' })
  @ApiResponse({ status: 409, description: 'Share already exists for this trader in this category.' })
  @Roles(Role.OWNER, Role.MANAGER)
  @Post('shares')
  async addTraderShare(
    @Body() dto: CreateDefaultTraderCategoryShareSwaggerDto,
  ) {
    return this.defaultTraderCategoryService.addShare(dto.defaultTraderCategoryId, dto);
  }

  @ApiOperation({ summary: 'Update trader share percent in a default category. Roles: OWNER, MANAGER.' })
  @ApiBody({ type: UpdateDefaultTraderCategoryShareSwaggerDto })
  @ApiResponse({ status: 200, description: 'Default share updated successfully.' })
  @ApiResponse({ status: 404, description: 'Share not found.' })
  @Roles(Role.OWNER, Role.MANAGER)
  @Patch('shares')
  async updateTraderShare(
    @Body() dto: UpdateDefaultTraderCategoryShareSwaggerDto,
  ) {
    return this.defaultTraderCategoryService.updateShare(
      dto.defaultTraderCategoryId,
      dto.traderId,
      dto.percent,
    );
  }

  @ApiOperation({ summary: 'Remove a trader share from a default category. Roles: OWNER, MANAGER.' })
  @ApiParam({ name: 'categoryId', type: Number, description: 'Default trader category ID.' })
  @ApiParam({ name: 'traderId', type: Number, description: 'Trader ID.' })
  @ApiResponse({ status: 200, description: 'Default share removed successfully.' })
  @ApiResponse({ status: 404, description: 'Share not found.' })
  @Roles(Role.OWNER, Role.MANAGER)
  @Delete(':categoryId/shares/:traderId')
  async removeTraderShare(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('traderId', ParseIntPipe) traderId: number,
  ) {
    return this.defaultTraderCategoryService.removeShare(categoryId, traderId);
  }
}