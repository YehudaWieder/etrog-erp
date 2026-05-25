// src/seasons/seasons.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SeasonsService } from './seasons.service';
import { Roles } from 'src/authorization/decorators/roles.decorator';
import { SeasonIdSwaggerDto, SeasonPreviewResponseSwaggerDto, SeasonYearNameSwaggerDto } from 'src/docs/dto/swagger-enums.dto';

@ApiTags('Seasons')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Roles(Role.OWNER, Role.MANAGER)
@Controller('seasons')
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Post('preview')
  @HttpCode(200)
  @ApiOperation({ summary: 'Preview creation of a new season including full default category/share bootstrap data.' })
  @ApiBody({
    type: SeasonYearNameSwaggerDto,
    examples: {
      sample: {
        summary: 'Preview a new season',
        value: {
          yearName: 2027,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Preview data returned successfully.',
    type: SeasonPreviewResponseSwaggerDto,
  })
  previewCreate(@Body() body: SeasonYearNameSwaggerDto) {
    return this.seasonsService.previewSeasonCreation(body.yearName);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new harvest season. Unique constraint: [yearName].' })
  @ApiBody({
    type: SeasonYearNameSwaggerDto,
    examples: {
      sample: {
        summary: 'Create a new season',
        value: {
          yearName: 2026,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Season created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate year name.' })
  create(@Body() body: SeasonYearNameSwaggerDto) {
    return this.seasonsService.createSeason(body.yearName);
  }

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({ summary: 'Retrieve all seasons' })
  @ApiResponse({ status: 200, description: 'List of all seasons returned successfully.' })
  findAll() {
    return this.seasonsService.findAll();
  }

  @Get('active')
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({ summary: 'Retrieve the currently active season' })
  @ApiResponse({ status: 200, description: 'Active season returned successfully.' })
  @ApiResponse({ status: 404, description: 'Active season not found.' })
  findActive() {
    return this.seasonsService.findActiveSeason();
  }

  @Get(':idOrSlug')
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({ summary: 'Retrieve a season by its numeric ID or URL-friendly slug' })
  @ApiParam({ name: 'idOrSlug', type: String, description: 'The numeric ID or slug of the season.' })
  @ApiResponse({ status: 200, description: 'Season returned successfully.' })
  @ApiResponse({ status: 404, description: 'Season not found.' })
  findOne(@Param('idOrSlug') idOrSlug: string) {
    const id = parseInt(idOrSlug);
    return this.seasonsService.findOne(isNaN(id) ? idOrSlug : id);
  }

  @Patch('set-active')
  @ApiOperation({ summary: 'Set a season as the currently active season (deactivates all others)' })
  @ApiBody({
    type: SeasonIdSwaggerDto,
    examples: {
      sample: {
        summary: 'Activate a season by ID',
        value: {
          id: 1,
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Season set as active successfully.' })
  @ApiResponse({ status: 404, description: 'Season not found.' })
  setActive(@Body() body: SeasonIdSwaggerDto) {
    return this.seasonsService.setActiveSeason(body.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a season by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the season to delete.' })
  @ApiResponse({ status: 200, description: 'Season deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Season not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.seasonsService.remove(id);
  }
}
