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
import { IsraelClassificationService } from './israel-classification.service';
import { CreateIsraelClassificationDto } from './dto/create-israel-classification.dto';
import { UpdateIsraelClassificationDto } from './dto/update-israel-classification.dto';

@ApiTags('Israel Harvest')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'JWT authentication failed or token is missing.',
})
@ApiForbiddenResponse({
  description: 'Access denied due to insufficient role or inactive user.',
})
@Roles(Role.OWNER, Role.MANAGER)
@Controller('israel/classifications')
export class IsraelClassificationController {
  constructor(
    private readonly israelClassificationService: IsraelClassificationService,
  ) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({
    summary: 'Retrieve all Israel sorting records for a harvest',
  })
  @ApiQuery({ name: 'harvestId', type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of Israel sorting records returned successfully.',
  })
  findAllByHarvest(@Query('harvestId', ParseIntPipe) harvestId: number) {
    return this.israelClassificationService.findAllByHarvest(harvestId);
  }

  @Get('season')
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({ summary: 'Retrieve all Israel sorting records for a season' })
  @ApiQuery({ name: 'seasonId', type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of Israel sorting records returned successfully.',
  })
  findAllBySeason(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.israelClassificationService.findAllBySeason(seasonId);
  }

  @Get('field-category-summary')
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({
    summary:
      'Retrieve, per field, a quantity/price/grade-group summary for each seller (field) category with data in a season',
  })
  @ApiQuery({ name: 'seasonId', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Field category summary returned successfully.',
  })
  getFieldCategorySummaryBySeason(
    @Query('seasonId', ParseIntPipe) seasonId: number,
  ) {
    return this.israelClassificationService.getFieldCategorySummaryBySeason(
      seasonId,
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new Israel sorting (classification) record',
  })
  @ApiResponse({
    status: 201,
    description: 'Israel sorting record created successfully.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  create(@Body() body: CreateIsraelClassificationDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelClassificationService.create(body, actor.id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an existing Israel sorting (classification) record',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Israel sorting record updated successfully.',
  })
  @ApiResponse({ status: 404, description: 'Israel sorting record not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateIsraelClassificationDto,
    @Req() req: Request,
  ) {
    const actor = req.user as AuthenticatedUser;
    return this.israelClassificationService.update(id, body, actor.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an Israel sorting (classification) record' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Israel sorting record deleted successfully.',
  })
  @ApiResponse({ status: 404, description: 'Israel sorting record not found.' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelClassificationService.remove(id, actor.id);
  }
}
