// src/shipments/controllers/box/box.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { BoxService } from '../../services/box/box.service';
import { BoxPackingWorkflowService } from '../../services/box/box-packing-workflow.service';
import { BoxResponseSwaggerDto } from 'src/docs/dto/swagger-enums.dto';
import { CreateBoxDto } from '../../services/box/dto/create-box.dto';
import { CreateBoxesBulkDto } from '../../services/box/dto/create-boxes-bulk.dto';
import { DeleteBoxesBulkDto } from '../../services/box/dto/delete-boxes-bulk.dto';
import { UpdateBoxDto } from '../../services/box/dto/update-box.dto';
import { PackBoxDto } from '../../services/box/dto/pack-box.dto';

@ApiTags('Logistics')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Controller('boxes')
export class BoxController {
  constructor(
    private readonly boxService: BoxService,
    private readonly boxPackingWorkflowService: BoxPackingWorkflowService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new box within a shipment. seasonId and totalQuantity are auto-managed by the server.' })
  @ApiBody({
    type: CreateBoxDto,
    examples: {
      traderBox: {
        summary: 'Box owned by a trader',
        value: {
          shipmentId: 15,
          boxNumber: 3,
          boxType: 'MEDIUM',
          ownershipType: 'TRADER',
          traderId: 3,
          notes: 'Dedicated box for trader 3',
        },
      },
      unassignedBox: {
        summary: 'General box (minimum required fields)',
        value: {
          shipmentId: 15,
          boxNumber: 4,
          boxType: 'SMALL',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Box created successfully.', type: BoxResponseSwaggerDto })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate box number in this shipment.' })
  create(@Body() data: CreateBoxDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.boxService.create(data, actor.id);
  }

  @Post('bulk')
  @ApiOperation({
    summary:
      'Create a contiguous range of boxes in a shipment by box number, defaulting to SMALL/GENERAL (to be configured later, e.g. via the packing form).',
  })
  @ApiBody({
    type: CreateBoxesBulkDto,
    examples: {
      range: {
        summary: 'Create boxes #100 through #150',
        value: { shipmentId: 15, startNumber: 100, endNumber: 150 },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Boxes created successfully.', type: BoxResponseSwaggerDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Invalid input or range too large.' })
  @ApiResponse({ status: 409, description: 'One or more box numbers in the range already exist.' })
  bulkCreate(@Body() data: CreateBoxesBulkDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.boxService.bulkCreate(data, actor.id);
  }

  @Get('shipment/:shipmentId')
  @ApiOperation({ summary: 'Retrieve all boxes belonging to a specific shipment' })
  @ApiParam({ name: 'shipmentId', type: Number, description: 'The ID of the shipment.' })
  @ApiResponse({ status: 200, description: 'List of boxes returned successfully.', type: BoxResponseSwaggerDto, isArray: true })
  @ApiResponse({ status: 404, description: 'Shipment not found.' })
  findByShipment(@Param('shipmentId', ParseIntPipe) shipmentId: number) {
    return this.boxService.findByShipment(shipmentId);
  }

  @Get('open')
  @ApiOperation({ summary: 'Retrieve all OPEN boxes for the active season, including shipment, trader and customer info' })
  @ApiResponse({ status: 200, description: 'List of open boxes returned successfully.' })
  findOpen() {
    return this.boxService.findOpenForActiveSeason();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single box by ID, including its items' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the box.' })
  @ApiResponse({ status: 200, description: 'Box returned successfully.', type: BoxResponseSwaggerDto })
  @ApiResponse({ status: 404, description: 'Box not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.boxService.findOne(id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update box details by ID. Editable fields: boxType, status, notes, ownershipType, traderId, customerId.' })
  @ApiBody({
    type: UpdateBoxDto,
    examples: {
      closeBox: {
        summary: 'Close a box',
        value: {
          id: 101,
          status: 'CLOSED',
          notes: 'Sealed and ready for dispatch',
        },
      },
      assignToCustomer: {
        summary: 'Reassign ownership to a customer',
        value: {
          id: 101,
          ownershipType: 'CUSTOMER',
          customerId: 7,
          traderId: null,
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Box updated successfully.', type: BoxResponseSwaggerDto })
  @ApiResponse({ status: 400, description: 'Invalid update data.' })
  @ApiResponse({ status: 404, description: 'Box not found.' })
  update(
    @Body() updateData: UpdateBoxDto,
    @Req() req: Request,
  ) {
    const { id, ...data } = updateData;
    const actor = req.user as AuthenticatedUser;
    return this.boxService.update(id, data, actor.id);
  }

  @Patch('pack')
  @ApiOperation({ summary: 'Update a box and create any number of shipment items in it, atomically in a single transaction.' })
  @ApiBody({
    type: PackBoxDto,
    examples: {
      packWithItems: {
        summary: 'Close a box while packing two items',
        value: {
          id: 101,
          status: 'CLOSED',
          items: [
            { traderCategoryId: 4, grade: 'A', pitamStatus: 'WITH_PITAM', quantity: 20, ownershipType: 'TRADER', traderId: 3 },
            { traderCategoryId: 4, grade: 'B', pitamStatus: 'WITHOUT_PITAM', quantity: 15, ownershipType: 'TRADER', traderId: 3 },
          ],
        },
      },
      boxOnlyEdit: {
        summary: 'Box edit with no items',
        value: { id: 101, notes: 'Sealed and ready for dispatch', items: [] },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Box updated and items created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update data, or a row failed validation — nothing was committed.' })
  @ApiResponse({ status: 404, description: 'Box not found.' })
  pack(@Body() data: PackBoxDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.boxPackingWorkflowService.packBox(data, actor.id);
  }

  @Patch('recalculate')
  @ApiOperation({ summary: 'Recalculate and update the total quantity for a box based on its items' })
  @ApiBody({
    type: UpdateBoxDto,
    examples: {
      sample: {
        summary: 'Recalculate payload',
        value: { id: 101 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Box total recalculated successfully.' })
  @ApiResponse({ status: 404, description: 'Box not found.' })
  recalculate(@Body() data: UpdateBoxDto) {
    return this.boxService.updateBoxTotal(data.id);
  }

  @Delete('bulk')
  @ApiOperation({
    summary: 'Permanently delete multiple boxes at once, atomically. Fails entirely if any box has items or linked trader stock.',
  })
  @ApiBody({
    type: DeleteBoxesBulkDto,
    examples: {
      sample: {
        summary: 'Delete three empty boxes',
        value: { ids: [101, 102, 103] },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Boxes permanently deleted.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 404, description: 'One or more boxes not found.' })
  @ApiResponse({ status: 409, description: 'One or more boxes have associated items or linked trader stock.' })
  bulkRemove(@Body() data: DeleteBoxesBulkDto, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.boxService.removeHardBulk(data.ids, actor.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete a box and all its items. This action is irreversible.' })
  @ApiParam({ name: 'id', type: Number, description: 'The numeric ID of the box to permanently delete.' })
  @ApiResponse({ status: 200, description: 'Box and all its items permanently deleted.' })
  @ApiResponse({ status: 404, description: 'Box not found.' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.boxService.removeHard(id, actor.id);
  }
}
