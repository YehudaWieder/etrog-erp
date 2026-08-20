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
import { IsraelShipmentService } from './israel-shipment.service';
import { CreateIsraelShipmentDto } from './dto/create-israel-shipment.dto';
import { UpdateIsraelShipmentDto } from './dto/update-israel-shipment.dto';

@ApiTags('Israel Shipments')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Roles(Role.OWNER, Role.MANAGER)
@Controller('israel/shipments')
export class IsraelShipmentController {
  constructor(private readonly israelShipmentService: IsraelShipmentService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({ summary: 'Retrieve all Israel shipments for a season' })
  @ApiQuery({ name: 'seasonId', type: Number })
  @ApiResponse({ status: 200, description: 'List of Israel shipments returned successfully.' })
  findAll(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.israelShipmentService.findAllBySeason(seasonId);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({ summary: 'Retrieve a single Israel shipment by ID, including its boxes' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Israel shipment returned successfully.' })
  @ApiResponse({ status: 404, description: 'Israel shipment not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.israelShipmentService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new Israel shipment. shipmentNumber must be unique within the season.' })
  @ApiResponse({ status: 201, description: 'Israel shipment created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  create(@Body() body: CreateIsraelShipmentDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelShipmentService.create(body, actor.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update Israel shipment details by ID. Editable fields: shipmentNumber, status, shippedAt, notes.' })
  @ApiResponse({ status: 200, description: 'Israel shipment updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Israel shipment not found.' })
  update(@Body() body: UpdateIsraelShipmentDto, @Req() req: Request) {
    const { id, ...data } = body;
    const actor = req.user as AuthenticatedUser;
    return this.israelShipmentService.update(id, data, actor.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete an Israel shipment. Fails if it still has boxes.' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Israel shipment permanently deleted.' })
  @ApiResponse({ status: 400, description: 'Shipment still has associated boxes.' })
  @ApiResponse({ status: 404, description: 'Israel shipment not found.' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelShipmentService.removeHard(id, actor.id);
  }
}
