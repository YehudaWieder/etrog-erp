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
import { IsraelBoxService } from './israel-box.service';
import { CreateIsraelBoxDto } from './dto/create-israel-box.dto';
import { CreateIsraelBoxesBulkDto } from './dto/create-israel-boxes-bulk.dto';
import { UpdateIsraelBoxDto } from './dto/update-israel-box.dto';
import { DeleteIsraelBoxesBulkDto } from './dto/delete-israel-boxes-bulk.dto';

@ApiTags('Israel Shipments')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
@Controller('israel/boxes')
export class IsraelBoxController {
  constructor(private readonly israelBoxService: IsraelBoxService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({ summary: 'Retrieve all Israel boxes for a season' })
  @ApiQuery({ name: 'seasonId', type: Number })
  @ApiResponse({ status: 200, description: 'List of Israel boxes returned successfully.' })
  findAll(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.israelBoxService.findAllBySeason(seasonId);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({ summary: 'Retrieve a single Israel box by ID, including its items' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Israel box returned successfully.' })
  @ApiResponse({ status: 404, description: 'Israel box not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.israelBoxService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new Israel box. boxNumber must be unique within the season.' })
  @ApiResponse({ status: 201, description: 'Israel box created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 409, description: 'Box number already exists in this season.' })
  create(@Body() body: CreateIsraelBoxDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelBoxService.create(body, actor.id);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create a contiguous range of Israel boxes by box number.' })
  @ApiResponse({ status: 201, description: 'Israel boxes created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input or range too large.' })
  @ApiResponse({ status: 409, description: 'One or more box numbers in the range already exist.' })
  bulkCreate(@Body() body: CreateIsraelBoxesBulkDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelBoxService.bulkCreate(body, actor.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update Israel box details by ID. Editable fields: boxNumber, shipmentId, status, notes.' })
  @ApiResponse({ status: 200, description: 'Israel box updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Israel box not found.' })
  update(@Body() body: UpdateIsraelBoxDto, @Req() req: Request) {
    const { id, ...data } = body;
    const actor = req.user as AuthenticatedUser;
    return this.israelBoxService.update(id, data, actor.id);
  }

  @Delete('bulk')
  @ApiOperation({ summary: 'Permanently delete multiple Israel boxes at once. Fails entirely if any box has items.' })
  @ApiResponse({ status: 200, description: 'Israel boxes permanently deleted.' })
  @ApiResponse({ status: 404, description: 'One or more boxes not found.' })
  @ApiResponse({ status: 409, description: 'One or more boxes have associated items.' })
  bulkRemove(@Body() body: DeleteIsraelBoxesBulkDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelBoxService.removeHardBulk(body.ids, actor.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete an Israel box. Fails if it still has items.' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Israel box permanently deleted.' })
  @ApiResponse({ status: 404, description: 'Israel box not found.' })
  @ApiResponse({ status: 409, description: 'Box has associated items.' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelBoxService.removeHard(id, actor.id);
  }
}
