import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req } from '@nestjs/common';
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
import { Request } from 'express';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import {
	CombinedInventorySummaryQuery,
	CombinedMovementScope,
	} from 'src/inventory/services/inventory-core/dto/combined-inventory-summary.dto';
import { InventoryService } from 'src/inventory/services/inventory.service';
import { Grade, PitamStatus } from '@prisma/client';
import { InternalTransferRequestDto } from 'src/inventory/services/inventory-core/dto/internal-transfer.dto';
import { CustomerGeneralAllocationRequestDto } from 'src/inventory/services/inventory-core/dto/customer-general-allocation.dto';
import { parseOptionalInt } from 'src/inventory/services/inventory-core/utils/inventory-query-parse.util';
import { PitamSplitService } from 'src/inventory/services/pitam-split/pitam-split.service';
import { ResolvePitamSplitDto } from 'src/inventory/services/pitam-split/dto/resolve-pitam-split.dto';
import { RemainsInItalyWithdrawalService } from 'src/inventory/services/remains-in-italy-withdrawal/remains-in-italy-withdrawal.service';
import { CreateRemainsInItalyWithdrawalDto } from 'src/inventory/services/remains-in-italy-withdrawal/dto/create-remains-in-italy-withdrawal.dto';
import { ReclassificationService } from 'src/inventory/services/reclassification/reclassification.service';
import { ResolveReclassificationDto } from 'src/inventory/services/reclassification/dto/resolve-reclassification.dto';
import { CustomerToGeneralTransferService } from 'src/inventory/services/customer-to-general-transfer/customer-to-general-transfer.service';
import { CreateCustomerToGeneralTransferDto } from 'src/inventory/services/customer-to-general-transfer/dto/create-customer-to-general-transfer.dto';

@ApiTags('Inventory')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Controller('inventory')
export class InventoryController {
	constructor(
		private readonly inventoryService: InventoryService,
		private readonly pitamSplitService: PitamSplitService,
		private readonly remainsInItalyWithdrawalService: RemainsInItalyWithdrawalService,
		private readonly reclassificationService: ReclassificationService,
		private readonly customerToGeneralTransferService: CustomerToGeneralTransferService,
	) {}

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
	@ApiQuery({ name: 'excludePrivateSelection', type: Boolean, required: false, description: 'When true, excludes PRIVATE_SELECTION movements from trader stock totals.' })
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
		@Query('excludePrivateSelection') excludePrivateSelection?: string,
	) {
		return this.inventoryService.getCombinedSummary({
			seasonId: parseOptionalInt(seasonId),
			movementScope,
			pitamStatus,
			ownerScope,
			traderId: parseOptionalInt(traderId),
			traderCategoryId: parseOptionalInt(traderCategoryId),
			grade,
			customerId: parseOptionalInt(customerId),
			customerCategoryId: parseOptionalInt(customerCategoryId),
			excludePrivateSelection: excludePrivateSelection === 'true',
		});
	}

	@Post('internal-transfer')
	@ApiOperation({
		summary:
			'Create internal transfer in TX with both sides (minus/plus): INTERNAL_TRANSFER, OWNERSHIP_TRANSFER, ASSIGNED manual.',
	})
	@ApiBody({
		type: InternalTransferRequestDto,
		description:
			'Always provide source and destination owners. For TRADER<->CUSTOMER flows you can provide side-specific fields (from*/to*) to map different source/target category/grade/pitam snapshots.',
		examples: {
			traderToCustomer: {
				summary: 'INTERNAL_TRANSFER - trader to customer with separate source/target snapshots',
				value: {
					type: 'INTERNAL_TRANSFER',
					date: '2026-10-10T09:00:00.000Z',
					dateHebrew: 'יז תשרי תשפז',
					quantity: 80,
					fromOwnerType: 'TRADER',
					fromTraderId: 4,
					fromTraderCategoryId: 3,
					fromGrade: 'א',
					fromPitamStatus: 'WITH_PITAM',
					toOwnerType: 'CUSTOMER',
					toCustomerId: 5,
					toCustomerCategoryId: 11,
					   // toPitamStatus: 'WITHOUT_PITAM', // לא רלוונטי יותר
					notes: 'Reserved for customer order #A120',
				},
			},
			moduloToTrader: {
				summary: 'ASSIGNED - modulo to trader (single snapshot is enough)',
				value: {
					type: 'ASSIGNED',
					date: '2026-10-11T08:00:00.000Z',
					quantity: 50,
					pitamStatus: 'MIXED',
					traderCategoryId: 3,
					grade: 'ב',
					fromOwnerType: 'MODULO',
					toOwnerType: 'TRADER',
					toTraderId: 9,
					notes: 'Assign modulo stock to trader',
				},
			},
			traderToTrader: {
				summary: 'OWNERSHIP_TRANSFER - trader to trader (single snapshot is enough)',
				value: {
					type: 'OWNERSHIP_TRANSFER',
					date: '2026-10-12T10:15:00.000Z',
					quantity: 30,
					pitamStatus: 'WITH_PITAM',
					traderCategoryId: 2,
					grade: 'ג',
					fromOwnerType: 'TRADER',
					fromTraderId: 7,
					toOwnerType: 'TRADER',
					toTraderId: 10,
					notes: 'Ownership reallocation',
				},
			},
		},
	})
	@ApiResponse({ status: 201, description: 'Internal transfer created successfully.' })
	@ApiResponse({ status: 400, description: 'Invalid payload or unsupported owner flow.' })
	create(@Body() data: InternalTransferRequestDto, @Req() req: Request) {
		const actor = req.user as AuthenticatedUser;
		return this.inventoryService.createInternalTransfer(data, actor.id);
	}

	@Post('customer-general-transfer')
	@ApiOperation({
		summary:
			'Create customer INTERNAL_TRANSFER from GENERAL in one TX: consume modulo first, then pull proportionally from traders by configured shares, and return rounding remainder to modulo as ASSIGNED.',
	})
	@ApiBody({
		type: CustomerGeneralAllocationRequestDto,
		description:
			'Creates customer allocation from general pool. System consumes modulo first, then completes from trader shares if needed.',
		examples: {
			default: {
				summary: 'Customer allocation from general inventory',
				value: {
					date: '2026-10-10T09:00:00.000Z',
					dateHebrew: 'יז תשרי תשפז',
					quantity: 80,
					pitamStatus: 'WITH_PITAM',
					grade: 'א',
					traderCategoryId: 3,
					customerId: 5,
					customerCategoryId: 11,
					notes: 'Reserved for customer order #A120',
				},
			},
		},
	})
	@ApiResponse({ status: 201, description: 'Customer general transfer created successfully.' })
	@ApiResponse({ status: 400, description: 'Invalid payload, missing shares, or insufficient stock.' })
	createCustomerAllocationFromGeneral(@Body() data: CustomerGeneralAllocationRequestDto, @Req() req: Request) {
		const actor = req.user as AuthenticatedUser;
		return this.inventoryService.createCustomerAllocationFromGeneral(data, actor.id);
	}

	@Patch('customer-general-transfer')
	@ApiOperation({
		summary:
			'Update customer general transfer in one TX: rollback linked trader movements and rebuild by current modulo+shares rules.',
	})
	@ApiBody({
		type: CustomerGeneralAllocationRequestDto,
		examples: {
			default: {
				summary: 'Update customer allocation from general inventory',
				value: {
					id: 1,
					date: '2026-10-10T09:00:00.000Z',
					dateHebrew: 'יז תשרי תשפז',
					quantity: 95,
					pitamStatus: 'WITH_PITAM',
					grade: 'א',
					traderCategoryId: 3,
					customerId: 5,
					customerCategoryId: 11,
					notes: 'Updated allocation after customer confirmation',
				},
			},
		},
	})
	@ApiResponse({ status: 200, description: 'Customer general transfer updated successfully.' })
	@ApiResponse({ status: 404, description: 'Customer general transfer not found.' })
	updateCustomerAllocationFromGeneral(
		@Body() data: CustomerGeneralAllocationRequestDto,
		@Req() req: Request,
	) {
		const { id, ...updateData } = data;
		const actor = req.user as AuthenticatedUser;
		return this.inventoryService.updateCustomerAllocationFromGeneral(id, updateData as CustomerGeneralAllocationRequestDto, actor.id);
	}

	@Delete('customer-general-transfer/:customerAllocationId')
	@ApiOperation({
		summary:
			'Delete customer general transfer in one TX: soft-delete customer row and all linked trader INTERNAL_TRANSFER/ASSIGNED movements.',
	})
	@ApiParam({ name: 'customerAllocationId', type: Number })
	@ApiResponse({ status: 200, description: 'Customer general transfer deleted successfully.' })
	@ApiResponse({ status: 404, description: 'Customer general transfer not found.' })
	removeCustomerAllocationFromGeneral(
		@Param('customerAllocationId', ParseIntPipe) customerAllocationId: number,
	) {
		return this.inventoryService.removeCustomerAllocationFromGeneral(customerAllocationId);
	}

	@Patch('internal-transfer')
	@ApiOperation({ summary: 'Update internal transfer in TX while preserving minus/plus integrity.' })
	@ApiBody({
		type: InternalTransferRequestDto,
		description: 'Same payload contract as create endpoint with required id field.',
		examples: {
			updateExample: {
				summary: 'Patch existing trader->customer transfer with side-specific fields',
				value: {
					id: 1,
					type: 'INTERNAL_TRANSFER',
					date: '2026-10-10T09:30:00.000Z',
					dateHebrew: 'יז תשרי תשפז',
					quantity: 90,
					fromOwnerType: 'TRADER',
					fromTraderId: 4,
					fromTraderCategoryId: 3,
					fromGrade: 'א',
					fromPitamStatus: 'WITH_PITAM',
					toOwnerType: 'CUSTOMER',
					toCustomerId: 5,
					toCustomerCategoryId: 11,
					   // toPitamStatus: 'WITHOUT_PITAM', // לא רלוונטי יותר
					notes: 'Updated allocation quantity',
				},
			},
		},
	})
	@ApiResponse({ status: 200, description: 'Internal transfer updated successfully.' })
	@ApiResponse({ status: 404, description: 'Internal transfer not found.' })
	update(
		@Body() data: InternalTransferRequestDto,
		@Req() req: Request,
	) {
		const { id, ...updateData } = data;
		const actor = req.user as AuthenticatedUser;
		return this.inventoryService.updateInternalTransfer(id, updateData as InternalTransferRequestDto, actor.id);
	}

	@Get('movements')
	@ApiOperation({
		summary: 'Get detailed trader inventory movements (TraderStock records) filtered by season and optional criteria.',
	})
	@ApiQuery({ name: 'seasonId', type: Number, required: true, description: 'Season ID.' })
	@ApiQuery({ name: 'traderId', type: Number, required: false, description: 'Filter by specific trader. Used with ownerScope=TRADER.' })
	@ApiQuery({ name: 'ownerScope', required: false, enum: ['ALL', 'TRADER', 'MODULO'], description: 'Filter by owner scope. ALL=all traders+modulo, TRADER=specific trader, MODULO=unassigned only.' })
	@ApiQuery({ name: 'shipmentScope', required: false, enum: ['ALL', 'UNSHIPPED', 'SHIPPED', 'PACKED_SHIPPED', 'SELF_PICKUP'], description: 'Filter by shipment status. SHIPPED=PACKED_SHIPPED+SELF_PICKUP.' })
	@ApiResponse({ status: 200, description: 'Movements returned successfully.' })
	getMovements(
		@Query('seasonId') seasonId?: string,
		@Query('traderId') traderId?: string,
		@Query('ownerScope') ownerScope?: string,
		@Query('shipmentScope') shipmentScope?: string,
	) {
		return this.inventoryService.getTraderMovements({
			seasonId: parseOptionalInt(seasonId),
			traderId: parseOptionalInt(traderId),
			ownerScope: ownerScope as any,
			shipmentScope: shipmentScope as any,
		});
	}

	@Delete('internal-transfer/:operationId')
	@ApiOperation({ summary: 'Soft delete internal transfer in TX on both sides.' })
	@ApiParam({ name: 'operationId', type: Number })
	@ApiResponse({ status: 200, description: 'Internal transfer deleted successfully.' })
	@ApiResponse({ status: 404, description: 'Internal transfer not found.' })
	remove(@Param('operationId', ParseIntPipe) operationId: number) {
		return this.inventoryService.removeInternalTransfer(operationId);
	}

	@Post('pitam-split')
	@ApiOperation({
		summary:
			'Resolve part of a trader\'s MIXED pitam balance into WITH_PITAM/WITHOUT_PITAM as new ledger movements (type=PITAM_SPLIT), without touching the original Classification record. ' +
			'Trader-only: a customer always has a definite pitam status, so there is nothing to resolve on that side. ' +
			'source=SPECIFIC_TRADER resolves one trader\'s own stock, MODULO resolves only the unassigned pool, and GENERAL splits the quantity exactly and evenly across every trader by their configured share when possible, otherwise takes the entire amount from modulo, otherwise fails with the minimum fair quantity.',
	})
	@ApiBody({
		type: ResolvePitamSplitDto,
		examples: {
			specificTrader: {
				summary: 'Resolve a specific trader\'s MIXED stock',
				value: {
					source: 'SPECIFIC_TRADER',
					traderId: 4,
					traderCategoryId: 3,
					grade: 'א',
					withQty: 6,
					withoutQty: 4,
					notes: 'Discovered during packing',
				},
			},
			modulo: {
				summary: 'Resolve unassigned (modulo) MIXED stock only',
				value: {
					source: 'MODULO',
					traderCategoryId: 3,
					grade: 'א',
					withQty: 10,
					withoutQty: 0,
				},
			},
			general: {
				summary: 'Resolve proportionally across all traders by their category share',
				value: {
					source: 'GENERAL',
					traderCategoryId: 3,
					grade: 'א',
					withQty: 50,
					withoutQty: 50,
				},
			},
		},
	})
	@ApiResponse({ status: 201, description: 'Pitam split resolved successfully.' })
	@ApiResponse({ status: 400, description: 'Invalid payload or insufficient MIXED stock.' })
	resolvePitamSplit(@Body() data: ResolvePitamSplitDto, @Req() req: Request) {
		const actor = req.user as AuthenticatedUser;
		return this.pitamSplitService.resolve(data, actor.id);
	}

	@Get('pitam-split')
	@ApiOperation({
		summary:
			'List pitam split batches available to undo (each groups every ledger row created by a single resolve() call — one negative/positive triple per affected trader, plus modulo).',
	})
	@ApiQuery({ name: 'seasonId', type: Number, required: false, description: 'Defaults to active season.' })
	@ApiQuery({ name: 'traderCategoryId', type: Number, required: false })
	@ApiQuery({ name: 'grade', enum: Grade, enumName: 'Grade', required: false })
	@ApiResponse({ status: 200, description: 'Pitam split batches.' })
	listPitamSplitBatches(
		@Query('seasonId') seasonId?: string,
		@Query('traderCategoryId') traderCategoryId?: string,
		@Query('grade') grade?: Grade,
	) {
		return this.pitamSplitService.listBatches({
			seasonId: parseOptionalInt(seasonId),
			traderCategoryId: parseOptionalInt(traderCategoryId),
			grade,
		});
	}

	@Delete('pitam-split/:batchId')
	@ApiOperation({
		summary:
			'Undo a pitam split batch: permanently deletes every ledger row it created, resolving MIXED stock back to what it was before the split. ' +
			'Fails if the WITH_PITAM/WITHOUT_PITAM stock it created has since been consumed downstream (e.g. packed into a shipment). ' +
			'For single-party (SPECIFIC_TRADER/MODULO) batches, an optional partial quantity can be passed to cancel only the still-unpacked portion; GENERAL-source batches must be cancelled in full.',
	})
	@ApiParam({ name: 'batchId', type: String })
	@ApiQuery({ name: 'quantity', type: Number, required: false, description: 'Partial quantity to cancel; omit to cancel the full batch. GENERAL-source batches reject any value other than the full quantity.' })
	@ApiResponse({ status: 200, description: 'Pitam split batch undone (rows permanently deleted or reduced).' })
	@ApiResponse({ status: 400, description: 'Split stock was already partially consumed and can no longer be undone.' })
	@ApiResponse({ status: 404, description: 'Batch not found.' })
	undoPitamSplit(@Param('batchId') batchId: string, @Query('quantity') quantity?: string) {
		return this.pitamSplitService.undoBatch(batchId, parseOptionalInt(quantity));
	}

	@Put('pitam-split/:batchId')
	@ApiOperation({
		summary:
			'Update a pitam split batch: in a single transaction, deletes every ledger row the previous batch created and creates a new batch from the given payload. ' +
			'Fails (leaving the original batch untouched) if the previous batch\'s WITH_PITAM/WITHOUT_PITAM stock has since been consumed downstream, or if the new payload is invalid.',
	})
	@ApiParam({ name: 'batchId', type: String })
	@ApiBody({ type: ResolvePitamSplitDto })
	@ApiResponse({ status: 200, description: 'Pitam split batch updated (old rows deleted, new batch created).' })
	@ApiResponse({ status: 400, description: 'Invalid payload, insufficient MIXED stock, or previous batch already consumed downstream.' })
	@ApiResponse({ status: 404, description: 'Batch not found.' })
	updatePitamSplit(@Param('batchId') batchId: string, @Body() data: ResolvePitamSplitDto, @Req() req: Request) {
		const actor = req.user as AuthenticatedUser;
		return this.pitamSplitService.updateBatch(batchId, data, actor.id);
	}

	@Post('remains-in-italy-withdrawal')
	@ApiOperation({
		summary:
			'Withdraw a quantity from the REMAINS_IN_ITALY bucket (traderId: null, isModulo: false) and route it to a destination. ' +
			'TRADER/CUSTOMER land directly in that owner\'s stock as a HARVEST_IN entry. ' +
			'GENERAL re-runs the same trader-share split every GENERAL classification goes through.',
	})
	@ApiBody({
		type: CreateRemainsInItalyWithdrawalDto,
		examples: {
			toTrader: {
				summary: 'Withdraw to a specific trader',
				value: {
					traderCategoryId: 3,
					grade: 'ה',
					pitamStatus: 'WITHOUT_PITAM',
					quantity: 10,
					destinationType: 'TRADER',
					traderId: 4,
				},
			},
			toCustomer: {
				summary: 'Withdraw to a specific customer',
				value: {
					traderCategoryId: 3,
					grade: 'ה',
					pitamStatus: 'WITHOUT_PITAM',
					quantity: 10,
					destinationType: 'CUSTOMER',
					customerId: 5,
					customerCategoryId: 11,
				},
			},
			toGeneral: {
				summary: 'Withdraw and split across every trader by their configured category share',
				value: {
					traderCategoryId: 3,
					grade: 'ה',
					pitamStatus: 'WITHOUT_PITAM',
					quantity: 10,
					destinationType: 'GENERAL',
				},
			},
		},
	})
	@ApiResponse({ status: 201, description: 'Withdrawal created successfully.' })
	@ApiResponse({ status: 400, description: 'Invalid payload or insufficient remains-in-Italy stock.' })
	createRemainsInItalyWithdrawal(@Body() data: CreateRemainsInItalyWithdrawalDto, @Req() req: Request) {
		const actor = req.user as AuthenticatedUser;
		return this.remainsInItalyWithdrawalService.create(data, actor.id);
	}

	@Post('customer-to-general-transfer')
	@ApiOperation({
		summary:
			'Transfer a quantity from a customer\'s unshipped stock into the GENERAL trader pool (opposite direction of customer-general-transfer). ' +
			'Splits across every trader in traderCategoryId by their configured share (default) or, when toRemainsInItaly is true (grade ה/ו only), ' +
			'parks it as a single row in the REMAINS_IN_ITALY bucket instead.',
	})
	@ApiBody({ type: CreateCustomerToGeneralTransferDto })
	@ApiResponse({ status: 201, description: 'Transfer created successfully.' })
	@ApiResponse({ status: 400, description: 'Invalid payload or insufficient unshipped customer stock.' })
	createCustomerToGeneralTransfer(@Body() data: CreateCustomerToGeneralTransferDto, @Req() req: Request) {
		const actor = req.user as AuthenticatedUser;
		return this.customerToGeneralTransferService.create(data, actor.id);
	}

	@Get('remains-in-italy-withdrawal')
	@ApiOperation({
		summary:
			'List remains-in-Italy withdrawals available to manage (each groups the negative REMAINS_IN_ITALY row with everything it created at its destination).',
	})
	@ApiQuery({ name: 'seasonId', type: Number, required: false, description: 'Defaults to active season.' })
	@ApiQuery({ name: 'traderCategoryId', type: Number, required: false })
	@ApiQuery({ name: 'grade', enum: Grade, enumName: 'Grade', required: false })
	@ApiQuery({ name: 'pitamStatus', enum: PitamStatus, enumName: 'PitamStatus', required: false })
	@ApiResponse({ status: 200, description: 'Remains-in-Italy withdrawals.' })
	listRemainsInItalyWithdrawals(
		@Query('seasonId') seasonId?: string,
		@Query('traderCategoryId') traderCategoryId?: string,
		@Query('grade') grade?: Grade,
		@Query('pitamStatus') pitamStatus?: PitamStatus,
	) {
		return this.remainsInItalyWithdrawalService.listWithdrawals({
			seasonId: parseOptionalInt(seasonId),
			traderCategoryId: parseOptionalInt(traderCategoryId),
			grade,
			pitamStatus,
		});
	}

	@Delete('remains-in-italy-withdrawal/:id')
	@ApiOperation({
		summary:
			'Undo a remains-in-Italy withdrawal: permanently deletes the negative REMAINS_IN_ITALY row and everything it created at its destination. ' +
			'Fails if that destination stock has since been consumed downstream (e.g. packed into a shipment). ' +
			'For TRADER/CUSTOMER destinations, an optional partial quantity can be passed to cancel only the still-unpacked portion; GENERAL destinations must be cancelled in full.',
	})
	@ApiParam({ name: 'id', type: Number })
	@ApiQuery({ name: 'quantity', type: Number, required: false, description: 'Partial quantity to cancel; omit to cancel the full withdrawal. GENERAL-destination withdrawals reject any value other than the full quantity.' })
	@ApiResponse({ status: 200, description: 'Withdrawal undone (rows permanently deleted or reduced).' })
	@ApiResponse({ status: 400, description: 'Destination stock was already partially consumed and can no longer be undone.' })
	@ApiResponse({ status: 404, description: 'Withdrawal not found.' })
	undoRemainsInItalyWithdrawal(@Param('id', ParseIntPipe) id: number, @Query('quantity') quantity?: string) {
		return this.remainsInItalyWithdrawalService.undoWithdrawal(id, parseOptionalInt(quantity));
	}

	@Put('remains-in-italy-withdrawal/:id')
	@ApiOperation({
		summary:
			'Update a remains-in-Italy withdrawal: in a single transaction, deletes everything the previous withdrawal created and creates a new one from the given payload.',
	})
	@ApiParam({ name: 'id', type: Number })
	@ApiBody({ type: CreateRemainsInItalyWithdrawalDto })
	@ApiResponse({ status: 200, description: 'Withdrawal updated (old rows deleted, new withdrawal created).' })
	@ApiResponse({ status: 400, description: 'Invalid payload, insufficient stock, or previous withdrawal already consumed downstream.' })
	@ApiResponse({ status: 404, description: 'Withdrawal not found.' })
	updateRemainsInItalyWithdrawal(
		@Param('id', ParseIntPipe) id: number,
		@Body() data: CreateRemainsInItalyWithdrawalDto,
		@Req() req: Request,
	) {
		const actor = req.user as AuthenticatedUser;
		return this.remainsInItalyWithdrawalService.updateWithdrawal(id, data, actor.id);
	}

	@Post('reclassification')
	@ApiOperation({
		summary:
			'Change category/grade/pitamStatus for a quantity without changing ownership, as new RECLASSIFICATION ledger movements, without touching the original Classification record. ' +
			'source=SPECIFIC_TRADER reclassifies one trader\'s own stock. ' +
			'source=GENERAL drains modulo first, then pulls any deficit from traders by their configured share; the resulting quantity is then split across traders by share (default) or, when toRemainsInItaly is true, parked as a single row in the REMAINS_IN_ITALY bucket. ' +
			'source=REMAINS_IN_ITALY withdraws from the remains-in-Italy bucket and always distributes the new classification via the normal GENERAL share split.',
	})
	@ApiBody({
		type: ResolveReclassificationDto,
		examples: {
			specificTrader: {
				summary: 'Reclassify a specific trader\'s stock',
				value: {
					source: 'SPECIFIC_TRADER',
					traderId: 4,
					fromTraderCategoryId: 3,
					fromGrade: 'א',
					fromPitamStatus: 'WITH_PITAM',
					toTraderCategoryId: 3,
					toGrade: 'ב',
					toPitamStatus: 'WITH_PITAM',
					quantity: 10,
				},
			},
			general: {
				summary: 'Reclassify general stock, split across traders by share',
				value: {
					source: 'GENERAL',
					fromTraderCategoryId: 3,
					fromGrade: 'א',
					fromPitamStatus: 'WITH_PITAM',
					toTraderCategoryId: 3,
					toGrade: 'ב',
					toPitamStatus: 'WITH_PITAM',
					quantity: 50,
				},
			},
			generalToRemainsInItaly: {
				summary: 'Reclassify general stock directly into the remains-in-Italy bucket',
				value: {
					source: 'GENERAL',
					fromTraderCategoryId: 3,
					fromGrade: 'א',
					fromPitamStatus: 'WITH_PITAM',
					toTraderCategoryId: 3,
					toGrade: 'ה',
					toPitamStatus: 'WITH_PITAM',
					quantity: 20,
					toRemainsInItaly: true,
				},
			},
			fromRemainsInItaly: {
				summary: 'Reclassify remains-in-Italy stock back into distributable inventory',
				value: {
					source: 'REMAINS_IN_ITALY',
					fromTraderCategoryId: 3,
					fromGrade: 'ה',
					fromPitamStatus: 'WITH_PITAM',
					toTraderCategoryId: 3,
					toGrade: 'ד',
					toPitamStatus: 'WITH_PITAM',
					quantity: 15,
				},
			},
		},
	})
	@ApiResponse({ status: 201, description: 'Reclassification resolved successfully.' })
	@ApiResponse({ status: 400, description: 'Invalid payload or insufficient stock.' })
	resolveReclassification(@Body() data: ResolveReclassificationDto, @Req() req: Request) {
		const actor = req.user as AuthenticatedUser;
		return this.reclassificationService.resolve(data, actor.id);
	}

	@Get('reclassification')
	@ApiOperation({
		summary:
			'List reclassification batches available to undo (each groups every ledger row created by a single resolve() call).',
	})
	@ApiQuery({ name: 'seasonId', type: Number, required: false, description: 'Defaults to active season.' })
	@ApiQuery({ name: 'traderCategoryId', type: Number, required: false })
	@ApiQuery({ name: 'grade', enum: Grade, enumName: 'Grade', required: false })
	@ApiQuery({ name: 'pitamStatus', enum: PitamStatus, enumName: 'PitamStatus', required: false })
	@ApiResponse({ status: 200, description: 'Reclassification batches.' })
	listReclassificationBatches(
		@Query('seasonId') seasonId?: string,
		@Query('traderCategoryId') traderCategoryId?: string,
		@Query('grade') grade?: Grade,
		@Query('pitamStatus') pitamStatus?: PitamStatus,
	) {
		return this.reclassificationService.listBatches({
			seasonId: parseOptionalInt(seasonId),
			traderCategoryId: parseOptionalInt(traderCategoryId),
			grade,
			pitamStatus,
		});
	}

	@Get('reclassification/summary')
	@ApiOperation({
		summary:
			'Aggregated reclassification totals for a season, grouped by (from classification -> to classification), for display as an informational deviation indicator alongside harvest/sorting summaries.',
	})
	@ApiQuery({ name: 'seasonId', type: Number, required: false, description: 'Defaults to active season.' })
	@ApiResponse({ status: 200, description: 'Reclassification summary.' })
	getReclassificationSummary(@Query('seasonId') seasonId?: string) {
		return this.reclassificationService.getReclassificationSummary(parseOptionalInt(seasonId));
	}

	@Delete('reclassification/:id')
	@ApiOperation({
		summary:
			'Undo a reclassification batch: permanently deletes every ledger row it created. ' +
			'Fails if the stock it created has since been consumed downstream (e.g. packed into a shipment). ' +
			'For SPECIFIC_TRADER-source batches, an optional partial quantity can be passed to cancel only the still-unpacked portion; GENERAL/REMAINS_IN_ITALY-source batches must be cancelled in full.',
	})
	@ApiParam({ name: 'id', type: Number })
	@ApiQuery({ name: 'quantity', type: Number, required: false, description: 'Partial quantity to cancel; omit to cancel the full batch. GENERAL/REMAINS_IN_ITALY-source batches reject any value other than the full quantity.' })
	@ApiResponse({ status: 200, description: 'Reclassification batch undone (rows permanently deleted or reduced).' })
	@ApiResponse({ status: 400, description: 'Created stock was already partially consumed and can no longer be undone.' })
	@ApiResponse({ status: 404, description: 'Batch not found.' })
	undoReclassification(@Param('id', ParseIntPipe) id: number, @Query('quantity') quantity?: string) {
		return this.reclassificationService.undoBatch(id, parseOptionalInt(quantity));
	}

	@Put('reclassification/:id')
	@ApiOperation({
		summary:
			'Update a reclassification batch: in a single transaction, deletes every ledger row the previous batch created and creates a new batch from the given payload.',
	})
	@ApiParam({ name: 'id', type: Number })
	@ApiBody({ type: ResolveReclassificationDto })
	@ApiResponse({ status: 200, description: 'Reclassification batch updated (old rows deleted, new batch created).' })
	@ApiResponse({ status: 400, description: 'Invalid payload, insufficient stock, or previous batch already consumed downstream.' })
	@ApiResponse({ status: 404, description: 'Batch not found.' })
	updateReclassification(
		@Param('id', ParseIntPipe) id: number,
		@Body() data: ResolveReclassificationDto,
		@Req() req: Request,
	) {
		const actor = req.user as AuthenticatedUser;
		return this.reclassificationService.updateBatch(id, data, actor.id);
	}
}
