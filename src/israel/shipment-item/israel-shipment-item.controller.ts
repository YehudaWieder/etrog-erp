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
import { IsraelShipmentItemService } from './israel-shipment-item.service';
import { CreateIsraelShipmentItemDto } from './dto/create-israel-shipment-item.dto';
import { UpdateIsraelShipmentItemDto } from './dto/update-israel-shipment-item.dto';
import { PackIsraelShipmentItemsDto } from './dto/pack-israel-shipment-items.dto';

@ApiTags('Israel Shipments')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
@Controller('israel/shipment-items')
export class IsraelShipmentItemController {
  constructor(private readonly israelShipmentItemService: IsraelShipmentItemService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({ summary: 'Retrieve all Israel shipment items for a season' })
  @ApiQuery({ name: 'seasonId', type: Number })
  @ApiResponse({ status: 200, description: 'List of Israel shipment items returned successfully.' })
  findAll(@Query('seasonId', ParseIntPipe) seasonId: number) {
    return this.israelShipmentItemService.findAllBySeason(seasonId);
  }

  @Get('box/:boxId')
  @Roles(Role.OWNER, Role.MANAGER, Role.EDITOR)
  @ApiOperation({ summary: 'Retrieve all items packed in a specific box' })
  @ApiParam({ name: 'boxId', type: Number })
  @ApiResponse({ status: 200, description: 'List of Israel shipment items returned successfully.' })
  findByBox(@Param('boxId', ParseIntPipe) boxId: number) {
    return this.israelShipmentItemService.findByBox(boxId);
  }

  @Post()
  @ApiOperation({ summary: 'Pack a new item into an open Israel box, deducting available stock.' })
  @ApiResponse({ status: 201, description: 'Israel shipment item created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input, box not open, or insufficient stock.' })
  create(@Body() body: CreateIsraelShipmentItemDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelShipmentItemService.create(body, actor.id);
  }

  @Post('pack')
  @ApiOperation({ summary: 'Pack multiple items into an open Israel box atomically, in a single transaction.' })
  @ApiResponse({ status: 201, description: 'Israel shipment items created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input, box not open, or insufficient stock for one of the rows — nothing was committed.' })
  pack(@Body() body: PackIsraelShipmentItemsDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelShipmentItemService.packItems(body, actor.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update an Israel shipment item. Editable fields: quantity, notes.' })
  @ApiResponse({ status: 200, description: 'Israel shipment item updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data, box not open, or insufficient stock.' })
  @ApiResponse({ status: 404, description: 'Israel shipment item not found.' })
  update(@Body() body: UpdateIsraelShipmentItemDto, @Req() req: Request) {
    const { id, ...data } = body;
    const actor = req.user as AuthenticatedUser;
    return this.israelShipmentItemService.update(id, data, actor.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove an item from its box, restoring the deducted stock.' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Israel shipment item removed successfully.' })
  @ApiResponse({ status: 400, description: 'Box has already been shipped or delivered.' })
  @ApiResponse({ status: 404, description: 'Israel shipment item not found.' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.israelShipmentItemService.remove(id, actor.id);
  }
}
