// src/israel/settings/controllers/field-categories/field-categories.controller.ts

import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { IsraelFieldCategoriesService } from 'src/israel/settings/services/field-categories/field-categories.service';
import { Roles } from 'src/authorization/decorators/roles.decorator';
import { CreateIsraelFieldCategoryDto } from 'src/israel/settings/services/field-categories/dto/create-israel-field-category.dto';
import { UpdateIsraelFieldCategoryDto } from 'src/israel/settings/services/field-categories/dto/update-israel-field-category.dto';

@ApiTags('Israel Settings')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'JWT authentication failed or token is missing.',
})
@ApiForbiddenResponse({
  description: 'Access denied due to insufficient role or inactive user.',
})
@Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
@Controller('israel/field-categories')
export class IsraelFieldCategoriesController {
  constructor(private readonly israelFieldCategoriesService: IsraelFieldCategoriesService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({ summary: 'Retrieve all Israel seller categories for a specific season' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season.' })
  @ApiResponse({ status: 200, description: 'List of Israel seller categories returned successfully.' })
  getAllBySeason(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.israelFieldCategoriesService.getAllBySeason(seasonId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new Israel seller category for a season. Unique constraint: [seasonId, fieldId, name].',
  })
  @ApiBody({
    type: CreateIsraelFieldCategoryDto,
    examples: {
      sample: {
        summary: 'Create a new seller category',
        value: {
          seasonId: 1,
          fieldId: 1,
          name: 'A Grade',
          price: 3.5,
          currency: 'ILS',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Israel seller category created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 404, description: 'Season or Israel field not found.' })
  @ApiResponse({ status: 409, description: 'Category already exists for this seller in this season.' })
  addCategory(@Body() body: CreateIsraelFieldCategoryDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelFieldCategoriesService.addCategory(body, actor.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update an existing Israel seller category by ID' })
  @ApiBody({
    type: UpdateIsraelFieldCategoryDto,
    examples: {
      sample: {
        summary: 'Update a seller category',
        value: {
          id: 1,
          name: 'A Grade',
          price: 3.5,
          currency: 'ILS',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Israel seller category updated successfully.' })
  @ApiResponse({ status: 404, description: 'Israel seller category with the given ID not found.' })
  @ApiResponse({ status: 409, description: 'Category already exists for this seller in this season.' })
  updateCategory(@Body() body: UpdateIsraelFieldCategoryDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelFieldCategoriesService.updateCategory(body.id, body, actor.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove an Israel seller category by its ID' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'The numeric ID of the Israel seller category to remove.',
  })
  @ApiResponse({ status: 200, description: 'Israel seller category removed successfully.' })
  @ApiResponse({ status: 404, description: 'Israel seller category not found.' })
  removeCategory(@Param('id', ParseIntPipe) id: number) {
    return this.israelFieldCategoriesService.removeCategory(id);
  }
}
