// src/israel/settings/controllers/sort-categories/sort-categories.controller.ts

import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
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
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { IsraelSortCategoriesService } from 'src/israel/settings/services/sort-categories/sort-categories.service';
import { Roles } from 'src/authorization/decorators/roles.decorator';
import { CreateIsraelSortCategoryDto } from 'src/israel/settings/services/sort-categories/dto/create-israel-sort-category.dto';
import { UpdateIsraelSortCategoryDto } from 'src/israel/settings/services/sort-categories/dto/update-israel-sort-category.dto';
import { ReorderIsraelSortCategoriesDto } from 'src/israel/settings/services/sort-categories/dto/reorder-israel-sort-categories.dto';

@ApiTags('Israel Settings')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'JWT authentication failed or token is missing.',
})
@ApiForbiddenResponse({
  description: 'Access denied due to insufficient role or inactive user.',
})
@Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
@Controller('israel/sort-categories')
export class IsraelSortCategoriesController {
  constructor(private readonly israelSortCategoriesService: IsraelSortCategoriesService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({ summary: 'Retrieve a list of all registered Israel sorting categories' })
  @ApiResponse({
    status: 200,
    description: 'List of Israel sorting categories returned successfully.',
  })
  getAllCategories() {
    return this.israelSortCategoriesService.getAllCategories();
  }

  @Post()
  @ApiOperation({
    summary: 'Register a new Israel sorting category. Unique constraint: [name].',
  })
  @ApiBody({
    type: CreateIsraelSortCategoryDto,
    examples: {
      sample: {
        summary: 'Create a new sorting category',
        value: {
          name: 'Mehudar',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Israel sorting category created successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or duplicate category name.',
  })
  addCategory(@Body() body: CreateIsraelSortCategoryDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelSortCategoriesService.addCategory(
      body.name,
      actor.id,
      body.supportedGrades,
      body.gradeGroups,
      body.notes,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove an Israel sorting category by its ID' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'The numeric ID of the Israel sorting category to remove.',
  })
  @ApiResponse({ status: 200, description: 'Israel sorting category removed successfully.' })
  @ApiResponse({ status: 404, description: 'Israel sorting category not found.' })
  removeCategory(@Param('id', ParseIntPipe) id: number) {
    return this.israelSortCategoriesService.removeCategory(id);
  }

  @Patch()
  @ApiOperation({ summary: 'Rename an existing Israel sorting category by ID' })
  @ApiBody({
    type: UpdateIsraelSortCategoryDto,
    examples: {
      sample: {
        summary: 'Rename an Israel sorting category by ID',
        value: {
          id: 1,
          name: 'Mehudar',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Israel sorting category renamed successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or duplicate new category name.',
  })
  @ApiResponse({
    status: 404,
    description: 'Israel sorting category with the given ID not found.',
  })
  updateCategory(@Body() body: UpdateIsraelSortCategoryDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelSortCategoriesService.updateCategory(
      body.id,
      body.name,
      actor.id,
      body.supportedGrades,
      body.gradeGroups,
      body.notes,
    );
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Persist a manual priority order for all Israel sorting categories.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['orderedIds'],
      properties: {
        orderedIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Sorting category IDs in the desired display order.',
          example: [4, 2, 1, 3],
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Sorting categories reordered successfully.' })
  @ApiResponse({ status: 400, description: 'orderedIds does not match the existing sorting categories.' })
  reorder(@Body() body: ReorderIsraelSortCategoriesDto) {
    return this.israelSortCategoriesService.reorder(body);
  }
}
