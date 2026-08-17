// src/israel/settings/controllers/category-grades/category-grades.controller.ts

import { Controller, Get, Post, Delete, Body, Param, Query, ParseIntPipe, Req } from '@nestjs/common';
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
import { IsraelCategoryGradesService } from 'src/israel/settings/services/category-grades/category-grades.service';
import { Roles } from 'src/authorization/decorators/roles.decorator';
import { SetIsraelCategoryGradeDto } from 'src/israel/settings/services/category-grades/dto/set-israel-category-grade.dto';

@ApiTags('Israel Settings')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'JWT authentication failed or token is missing.',
})
@ApiForbiddenResponse({
  description: 'Access denied due to insufficient role or inactive user.',
})
@Roles(Role.OWNER, Role.MANAGER)
@Controller('israel/category-grades')
export class IsraelCategoryGradesController {
  constructor(private readonly israelCategoryGradesService: IsraelCategoryGradesService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({ summary: 'Retrieve all Israel category grade sets for a specific season' })
  @ApiQuery({ name: 'seasonId', type: Number, description: 'The ID of the season.' })
  @ApiResponse({ status: 200, description: 'List of Israel category grade sets returned successfully.' })
  getAllBySeason(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.israelCategoryGradesService.getAllBySeason(seasonId);
  }

  @Post()
  @ApiOperation({
    summary: "Create or update a sorting category's grade set for a season. Unique constraint: [seasonId, categoryId].",
  })
  @ApiBody({
    type: SetIsraelCategoryGradeDto,
    examples: {
      sample: {
        summary: 'Set grades for a sorting category',
        value: {
          seasonId: 1,
          categoryId: 1,
          grades: { A: 'Mehudar', B: 'A Grade', C: 'B Grade' },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Israel category grade set saved successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid grades payload.' })
  @ApiResponse({ status: 404, description: 'Season or sorting category not found.' })
  setForCategory(@Body() body: SetIsraelCategoryGradeDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelCategoryGradesService.setForCategory(body, actor.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Remove a sorting category's grade set by ID" })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'The numeric ID of the Israel category grade set to remove.',
  })
  @ApiResponse({ status: 200, description: 'Israel category grade set removed successfully.' })
  @ApiResponse({ status: 404, description: 'Israel category grade set not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.israelCategoryGradesService.remove(id);
  }
}
