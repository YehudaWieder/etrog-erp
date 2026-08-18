import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
} from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { Roles } from 'src/authorization/decorators/roles.decorator';
import { IsraelHarvestService } from './israel-harvest.service';
import { CreateIsraelHarvestDto } from './dto/create-israel-harvest.dto';
import { UpdateIsraelHarvestDto } from './dto/update-israel-harvest.dto';

@ApiTags('Israel Harvest')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Roles(Role.OWNER, Role.MANAGER)
@Controller('israel/harvests')
export class IsraelHarvestController {
  constructor(private readonly israelHarvestService: IsraelHarvestService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({ summary: 'Retrieve all Israel harvest records for a season' })
  @ApiQuery({ name: 'seasonId', type: Number })
  @ApiResponse({ status: 200, description: 'List of Israel harvest records returned successfully.' })
  findAll(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.israelHarvestService.findAllBySeason(seasonId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new Israel harvest record' })
  @ApiResponse({ status: 201, description: 'Israel harvest record created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  create(@Body() body: CreateIsraelHarvestDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelHarvestService.create(body, actor.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing Israel harvest record' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Israel harvest record updated successfully.' })
  @ApiResponse({ status: 404, description: 'Israel harvest record not found.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateIsraelHarvestDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelHarvestService.update(id, body, actor.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an Israel harvest record' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Israel harvest record deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Israel harvest record not found.' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelHarvestService.remove(id, actor.id);
  }
}
