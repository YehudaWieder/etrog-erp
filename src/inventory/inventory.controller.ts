import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import {
	ApiBearerAuth,
	ApiBody,
	ApiForbiddenResponse,
	ApiOperation,
	ApiParam,
	ApiQuery,
	ApiResponse,
	ApiTags,
	ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
	CombinedInventorySummaryQuery,
	CombinedMovementScope,
	CustomerGeneralAllocationRequest,
	InternalTransferRequest,
	InventoryService,
} from './inventory.service';
import { Grade, PitamStatus } from 'src/generated/prisma';

@ApiTags('Inventory')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Controller('inventory')
export class InventoryController {
	constructor(private readonly inventoryService: InventoryService) {}

	@Get('summary')
	@ApiOperation({
		summary: 'Combined trader + customer inventory totals with shared and side-specific filters. ownerScope (MODULO/TRADER) applies to the trader side only.',
	})
	@ApiQuery({ name: 'seasonId', type: Number, required: false, description: 'Season ID. Defaults to active season.' })
	@ApiQuery({ name: 'movementScope', required: false, enum: ['ALL', 'SHIPPED', 'UNSHIPPED', 'PACKED_SHIPPED', 'SELF_PICKUP', 'HARVEST_IN', 'INTERNAL_TRANSFER', 'OWNERSHIP_TRANSFER', 'ASSIGNED', 'WASTE', 'ADJUSTMENT'], description: 'Applied to both trader and customer rows. SHIPPED = PACKED_SHIPPED + SELF_PICKUP. UNSHIPPED = all other types.' })
	@ApiQuery({ name: 'pitamStatus', enum: PitamStatus, enumName: 'PitamStatus', required: false, description: 'Applied to both trader and customer rows.' })
	@ApiQuery({ name: 'ownerScope', required: false, enum: ['ALL', 'TRADER', 'MODULO'], description: 'Trader side only. MODULO = unassigned stock. TRADER requires traderId.' })
	@ApiQuery({ name: 'traderId', type: Number, required: false, description: 'Trader side only. Required when ownerScope=TRADER.' })
	@ApiQuery({ name: 'traderCategoryId', type: Number, required: false, description: 'Trader side only.' })
	@ApiQuery({ name: 'grade', enum: Grade, enumName: 'Grade', required: false, description: 'Trader side only.' })
	@ApiQuery({ name: 'customerId', type: Number, required: false, description: 'Customer side only.' })
	@ApiQuery({ name: 'customerCategoryId', type: Number, required: false, description: 'Customer side only.' })
	@ApiResponse({ status: 200, description: 'Combined inventory summary returned successfully.' })
	getCombinedSummary(
		@Query('seasonId') seasonId?: string,
		@Query('movementScope') movementScope?: CombinedMovementScope,
		@Query('pitamStatus') pitamStatus?: PitamStatus,
		@Query('ownerScope') ownerScope?: CombinedInventorySummaryQuery['ownerScope'],
		@Query('traderId') traderId?: string,
		@Query('traderCategoryId') traderCategoryId?: string,
		@Query('grade') grade?: Grade,
		@Query('customerId') customerId?: string,
		@Query('customerCategoryId') customerCategoryId?: string,
	) {
		return this.inventoryService.getCombinedSummary({
			seasonId: seasonId ? parseInt(seasonId) : undefined,
			movementScope,
			pitamStatus,
			ownerScope,
			traderId: traderId ? parseInt(traderId) : undefined,
			traderCategoryId: traderCategoryId ? parseInt(traderCategoryId) : undefined,
			grade,
			customerId: customerId ? parseInt(customerId) : undefined,
			customerCategoryId: customerCategoryId ? parseInt(customerCategoryId) : undefined,
		});
	}

	@Post('internal-transfer')
	@ApiOperation({
		summary:
			'Create internal transfer in TX with both sides (minus/plus): INTERNAL_TRANSFER, OWNERSHIP_TRANSFER, ASSIGNED manual.',
	})
	@ApiBody({ type: Object })
	@ApiResponse({ status: 201, description: 'Internal transfer created successfully.' })
	@ApiResponse({ status: 400, description: 'Invalid payload or unsupported owner flow.' })
	create(@Body() data: InternalTransferRequest) {
		return this.inventoryService.createInternalTransfer(data);
	}

	@Post('customer-general-transfer')
	@ApiOperation({
		summary:
			'Create customer INTERNAL_TRANSFER from GENERAL in one TX: consume modulo first, then pull proportionally from traders by configured shares, and return rounding remainder to modulo as ASSIGNED.',
	})
	@ApiBody({ type: Object })
	@ApiResponse({ status: 201, description: 'Customer general transfer created successfully.' })
	@ApiResponse({ status: 400, description: 'Invalid payload, missing shares, or insufficient stock.' })
	createCustomerAllocationFromGeneral(@Body() data: CustomerGeneralAllocationRequest) {
		return this.inventoryService.createCustomerAllocationFromGeneral(data);
	}

	@Patch('internal-transfer/:operationId')
	@ApiOperation({ summary: 'Update internal transfer in TX while preserving minus/plus integrity.' })
	@ApiParam({ name: 'operationId', type: Number })
	@ApiBody({ type: Object })
	@ApiResponse({ status: 200, description: 'Internal transfer updated successfully.' })
	@ApiResponse({ status: 404, description: 'Internal transfer not found.' })
	update(
		@Param('operationId', ParseIntPipe) operationId: number,
		@Body() data: InternalTransferRequest,
	) {
		return this.inventoryService.updateInternalTransfer(operationId, data);
	}

	@Delete('internal-transfer/:operationId')
	@ApiOperation({ summary: 'Soft delete internal transfer in TX on both sides.' })
	@ApiParam({ name: 'operationId', type: Number })
	@ApiResponse({ status: 200, description: 'Internal transfer deleted successfully.' })
	@ApiResponse({ status: 404, description: 'Internal transfer not found.' })
	remove(@Param('operationId', ParseIntPipe) operationId: number) {
		return this.inventoryService.removeInternalTransfer(operationId);
	}
}
