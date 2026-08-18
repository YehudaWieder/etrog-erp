import { Controller, Get, Post, Body, Query, ParseIntPipe, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { Roles } from 'src/authorization/decorators/roles.decorator';
import { IsraelClassificationService } from './israel-classification.service';
import { CreateIsraelClassificationDto } from './dto/create-israel-classification.dto';

@ApiTags('Israel Harvest')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Roles(Role.OWNER, Role.MANAGER)
@Controller('israel/classifications')
export class IsraelClassificationController {
  constructor(private readonly israelClassificationService: IsraelClassificationService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({ summary: 'Retrieve all Israel sorting records for a harvest' })
  @ApiQuery({ name: 'harvestId', type: Number })
  @ApiResponse({ status: 200, description: 'List of Israel sorting records returned successfully.' })
  findAllByHarvest(@Query('harvestId', ParseIntPipe) harvestId: number) {
    return this.israelClassificationService.findAllByHarvest(harvestId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new Israel sorting (classification) record' })
  @ApiResponse({ status: 201, description: 'Israel sorting record created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  create(@Body() body: CreateIsraelClassificationDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelClassificationService.create(body, actor.id);
  }
}
