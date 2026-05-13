       // בדיקה: אם מדובר בהעברה ללקוח, יש לוודא שהקטגוריה שייכת ללקוח
       if (side === 'to' && ownerType === InventoryOwnerType.CUSTOMER && data.toCustomerId && data.toCustomerCategoryId) {
	       const category = await this.prisma.customerCategory.findFirst({
		       where: {
			       id: data.toCustomerCategoryId,
			       customerId: data.toCustomerId,
		       },
	       });
	       if (!category) {
		       throw new BadRequestException('Customer category does not belong to the specified customer');
	       }
       }
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MovementType, PitamStatus, Grade, Prisma, SourceType } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { SeasonsService } from 'src/seasons/seasons.service';
import { InventoryAvailabilityService } from './services/inventory-availability.service';

export enum InventoryOwnerType {
	TRADER = 'TRADER',
	CUSTOMER = 'CUSTOMER',
	MODULO = 'MODULO',
}

export class InternalTransferRequest {
	id!: number; // ID of the internal transfer operation to update

	type!: MovementType;
	date!: string;
	dateHebrew?: string;
	quantity!: number;
	pitamStatus?: PitamStatus;
	grade?: Grade;
	traderCategoryId?: number;
	customerCategoryId?: number;
	fromPitamStatus?: PitamStatus;

	fromTraderCategoryId?: number;
	fromGrade?: Grade;
	fromCustomerCategoryId?: number;
	toTraderCategoryId?: number;
	toGrade?: Grade;
	toCustomerCategoryId?: number;
	fromOwnerType!: InventoryOwnerType;
	fromTraderId?: number;
	fromCustomerId?: number;
	toOwnerType!: InventoryOwnerType;
	toTraderId?: number;
	toCustomerId?: number;
	notes?: string;
}

export class CustomerGeneralAllocationRequest {
	id!: number; // ID of the customer allocation to update

	date!: string;
	dateHebrew!: string;
	quantity!: number;
	pitamStatus!: PitamStatus;
	grade!: Grade;
	traderCategoryId!: number;
	customerId!: number;
	customerCategoryId!: number;
	notes?: string;
}

type TransferLedgerRecord =
	| { table: 'traderStock'; record: Prisma.TraderStockGetPayload<{}> }
	| { table: 'customerAllocation'; record: Prisma.CustomerAllocationGetPayload<{}> };

type TransferSideSpec = {
	pitamStatus: PitamStatus;
	traderCategoryId?: number;
	grade?: Grade;
	customerCategoryId?: number;
};

export type CombinedMovementScope =
	| 'ALL'
	| 'SHIPPED'
	| 'UNSHIPPED'
	| 'PACKED_SHIPPED'
	| 'SELF_PICKUP'
	| 'HARVEST_IN'
	| 'INTERNAL_TRANSFER'
	| 'OWNERSHIP_TRANSFER'
	| 'ASSIGNED'
	| 'WASTE'
	| 'ADJUSTMENT';

export interface CombinedInventorySummaryQuery {
	seasonId?: number;
	// Trader-specific (MODULO scope affects trader side only)
	ownerScope?: 'ALL' | 'TRADER' | 'MODULO';
	traderId?: number;
	traderCategoryId?: number;
	grade?: Grade;
	// Customer-specific
	customerId?: number;
	customerCategoryId?: number;
	// Common
	pitamStatus?: PitamStatus;
	movementScope?: CombinedMovementScope;
}

@Injectable()
export class InventoryService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly seasonsService: SeasonsService,
		private readonly inventoryAvailabilityService: InventoryAvailabilityService,
	) {}

	async createInternalTransfer(data: InternalTransferRequest, actorId: number) {
		this.validateTransferDto(data);
		const { id: seasonId } = await this.seasonsService.findActiveSeason();

		return this.prisma.$transaction(async (tx) => {
			return this.createTransferPairTx(tx, seasonId, data, actorId);
		});
	}

	async createCustomerAllocationFromGeneral(data: CustomerGeneralAllocationRequest, actorId: number) {
		this.validateCustomerGeneralAllocationDto(data);
		const { id: seasonId } = await this.seasonsService.findActiveSeason();

		return this.prisma.$transaction(async (tx) => {
			const requestQuantity = Math.trunc(data.quantity);
			const customerAllocation = await tx.customerAllocation.create({
				data: {
					seasonId,
					date: new Date(data.date),
					dateHebrew: data.dateHebrew,
					customerId: data.customerId,
					customerCategoryId: data.customerCategoryId,
					pitamStatus: data.pitamStatus,
					quantity: requestQuantity,
					type: MovementType.INTERNAL_TRANSFER,
					takenFrom: SourceType.GENERAL,
					traderId: null,
					updatedById: actorId,
					notes: data.notes,
				},
			});

			const movementReferenceId = customerAllocation.id;

			await tx.customerAllocation.update({
				where: { id: customerAllocation.id },
				data: { MovementReferenceId: movementReferenceId },
			});

			const movementSummary = await this.applyCustomerGeneralAllocationMovementsTx(
				tx,
				seasonId,
				data,
				actorId,
				movementReferenceId,
				requestQuantity,
			);

			return {
				movementReferenceId,
				customerAllocationId: customerAllocation.id,
				requestedQuantity: requestQuantity,
				...movementSummary,
			};
		});
	}

	async updateCustomerAllocationFromGeneral(customerAllocationId: number, data: CustomerGeneralAllocationRequest, actorId: number) {
		this.validateCustomerGeneralAllocationDto(data);
		const { id: seasonId } = await this.seasonsService.findActiveSeason();

		return this.prisma.$transaction(async (tx) => {
			const existing = await this.getCustomerGeneralAllocationOperationTx(tx, customerAllocationId);
			const movementReferenceId = existing.MovementReferenceId ?? existing.id;
			const requestQuantity = Math.trunc(data.quantity);

			await tx.traderStock.updateMany({
				where: {
					MovementReferenceId: movementReferenceId,
					isDeleted: false,
					type: { in: [MovementType.INTERNAL_TRANSFER, MovementType.ASSIGNED] },
				},
				data: { isDeleted: true },
			});

			await tx.customerAllocation.update({
				where: { id: existing.id },
				data: {
					seasonId,
					date: new Date(data.date),
					dateHebrew: data.dateHebrew,
					customerId: data.customerId,
					customerCategoryId: data.customerCategoryId,
					pitamStatus: data.pitamStatus,
					quantity: requestQuantity,
					type: MovementType.INTERNAL_TRANSFER,
					takenFrom: SourceType.GENERAL,
					traderId: null,
					updatedById: actorId,
					notes: data.notes,
					MovementReferenceId: movementReferenceId,
					isDeleted: false,
				},
			});

			const movementSummary = await this.applyCustomerGeneralAllocationMovementsTx(
				tx,
				seasonId,
				data,
				actorId,
				movementReferenceId,
				requestQuantity,
			);

			return {
				movementReferenceId,
				customerAllocationId: existing.id,
				requestedQuantity: requestQuantity,
				...movementSummary,
			};
		});
	}

	async removeCustomerAllocationFromGeneral(customerAllocationId: number) {
		return this.prisma.$transaction(async (tx) => {
			const existing = await this.getCustomerGeneralAllocationOperationTx(tx, customerAllocationId);
			const movementReferenceId = existing.MovementReferenceId ?? existing.id;

			const customerDeleted = await tx.customerAllocation.updateMany({
				where: {
					id: existing.id,
					isDeleted: false,
				},
				data: { isDeleted: true },
			});

			const traderDeleted = await tx.traderStock.updateMany({
				where: {
					MovementReferenceId: movementReferenceId,
					isDeleted: false,
					type: { in: [MovementType.INTERNAL_TRANSFER, MovementType.ASSIGNED] },
				},
				data: { isDeleted: true },
			});

			return {
				movementReferenceId,
				customerAllocationId: existing.id,
				deleted: {
					customerAllocations: customerDeleted.count,
					traderStocks: traderDeleted.count,
				},
			};
		});
	}

	private async applyCustomerGeneralAllocationMovementsTx(
		tx: Prisma.TransactionClient,
		seasonId: number,
		data: CustomerGeneralAllocationRequest,
		actorId: number,
		movementReferenceId: number,
		requestQuantity: number,
	) {
		const moduloAvailable = Math.max(
			0,
			await this.inventoryAvailabilityService.getTraderUnshippedBalance(tx, {
				seasonId,
				traderId: null,
				traderCategoryId: data.traderCategoryId,
				grade: data.grade,
				pitamStatus: data.pitamStatus,
				isModulo: true,
			}),
		);
		const moduloUsed = Math.min(moduloAvailable, requestQuantity);
		const deficit = requestQuantity - moduloUsed;

		if (moduloUsed > 0) {
			await tx.traderStock.create({
				data: {
					seasonId,
					date: new Date(data.date),
					traderId: null,
					traderCategoryId: data.traderCategoryId,
					grade: data.grade,
					pitamStatus: data.pitamStatus,
					quantity: -moduloUsed,
					isModulo: true,
					type: MovementType.INTERNAL_TRANSFER,
					MovementReferenceId: movementReferenceId,
					shipmentId: null,
					boxId: null,
					updatedById: actorId,
					notes: data.notes,
				},
			});
		}

		let traderTakenTotal = 0;
		let moduloRemainder = 0;

		if (deficit > 0) {
			const shares = await tx.traderCategoryShare.findMany({
				where: {
					seasonId,
					traderCategoryId: data.traderCategoryId,
				},
				orderBy: { traderId: 'asc' },
			});

			if (shares.length === 0) {
				throw new BadRequestException(
					`No trader shares found for category ${data.traderCategoryId} in season ${seasonId}`,
				);
			}

			const normalizedShares = shares.map((share) => ({
				traderId: share.traderId,
				percent: Number(share.percent),
				percentText: share.percent.toString(),
			}));

			const totalPercent = normalizedShares.reduce((sum, share) => sum + share.percent, 0);
			if (Math.abs(totalPercent - 100) > 1e-9) {
				throw new BadRequestException(
					`Invalid shares for category ${data.traderCategoryId}: sum of percents must be exactly 100`,
				);
			}

			const grossFromTraders = this.calculateMinimalGrossByShares(deficit, normalizedShares.map((share) => share.percentText));
			const traderAllocations = normalizedShares.map((share) => ({
				traderId: share.traderId,
				quantity: this.calculateExactShareQuantity(grossFromTraders, share.percentText),
			}));

			if (traderAllocations.some((allocation) => allocation.quantity <= 0)) {
				throw new BadRequestException(
					'Requested quantity cannot be distributed to all traders by configured shares; increase quantity or adjust shares',
				);
			}

			for (const allocation of traderAllocations) {
				await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(tx, {
					seasonId,
					traderId: allocation.traderId,
					traderCategoryId: data.traderCategoryId,
					grade: data.grade,
					pitamStatus: data.pitamStatus,
					isModulo: false,
					requiredQuantity: allocation.quantity,
					contextLabel: `Customer allocation from general (trader ${allocation.traderId})`,
				});
			}

			for (const allocation of traderAllocations) {
				await tx.traderStock.create({
					data: {
						seasonId,
						date: new Date(data.date),
						traderId: allocation.traderId,
						traderCategoryId: data.traderCategoryId,
						grade: data.grade,
						pitamStatus: data.pitamStatus,
						quantity: -allocation.quantity,
						isModulo: false,
						type: MovementType.INTERNAL_TRANSFER,
						MovementReferenceId: movementReferenceId,
						shipmentId: null,
						boxId: null,
						updatedById: actorId,
						notes: data.notes,
					},
				});
			}

			traderTakenTotal = traderAllocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
			moduloRemainder = traderTakenTotal - deficit;

			if (moduloRemainder > 0) {
				await tx.traderStock.create({
					data: {
						seasonId,
						date: new Date(data.date),
						traderId: null,
						traderCategoryId: data.traderCategoryId,
						grade: data.grade,
						pitamStatus: data.pitamStatus,
						quantity: moduloRemainder,
						isModulo: true,
						type: MovementType.ASSIGNED,
						MovementReferenceId: movementReferenceId,
						shipmentId: null,
						boxId: null,
						updatedById: actorId,
						notes: data.notes,
					},
				});
			}
		}

		return {
			usedFromModulo: moduloUsed,
			takenFromTraders: traderTakenTotal,
			returnedToModulo: moduloRemainder,
		};
	}

	private async getCustomerGeneralAllocationOperationTx(
		tx: Prisma.TransactionClient,
		customerAllocationId: number,
	) {
		const row = await tx.customerAllocation.findFirst({
			where: {
				id: customerAllocationId,
				isDeleted: false,
				type: MovementType.INTERNAL_TRANSFER,
				takenFrom: SourceType.GENERAL,
			},
		});

		if (!row) {
			throw new NotFoundException(`Customer general transfer ${customerAllocationId} not found`);
		}

		return row;
	}

	async updateInternalTransfer(operationId: number, data: InternalTransferRequest, actorId: number) {
		this.validateTransferDto(data);

		return this.prisma.$transaction(async (tx) => {
			const pair = await this.getTransferPairTx(tx, operationId);
			const { id: seasonId } = await this.seasonsService.findActiveSeason();

			const expectedTables = this.getExpectedTables(data);
			const existingTables = [pair.negative.table, pair.positive.table].sort().join('|');

			if (expectedTables !== existingTables) {
				await this.softDeletePairTx(tx, pair.negative.record.id, pair.positive.record.id);
				return this.createTransferPairTx(tx, seasonId, data, actorId);
			}

			const rebuilt = this.buildTransferPayloads(seasonId, data, actorId);
			await this.assertNegativeLedgerHasEnoughStockTx(tx, rebuilt.negative, pair.negative);

			const updatedNegative = await this.updateByLedgerTx(
				tx,
				pair.negative,
				rebuilt.negative,
				pair.positive.record.id,
			);
			const updatedPositive = await this.updateByLedgerTx(
				tx,
				pair.positive,
				rebuilt.positive,
				pair.negative.record.id,
			);

			return {
				operationIds: [pair.negative.record.id, pair.positive.record.id],
				negative: updatedNegative,
				positive: updatedPositive,
			};
		});
	}

	async removeInternalTransfer(operationId: number) {
		return this.prisma.$transaction(async (tx) => {
			const pair = await this.getTransferPairTx(tx, operationId);
			const deleted = await this.softDeletePairTx(tx, pair.negative.record.id, pair.positive.record.id);

			return {
				operationIds: [pair.negative.record.id, pair.positive.record.id],
				deleted,
			};
		});
	}

	async getCombinedSummary(query: CombinedInventorySummaryQuery) {
		const seasonId = query.seasonId ?? (await this.seasonsService.findActiveSeason()).id;
		await this.seasonsService.assertSeasonExists(seasonId);

		const ownerScope = query.ownerScope ?? 'ALL';
		const movementScope = query.movementScope ?? 'ALL';

		this.validateCombinedQuery(ownerScope, movementScope, query.traderId);

		// ── Trader where ──
		const traderWhere: Prisma.TraderStockWhereInput = { seasonId, isDeleted: false };
		if (query.traderCategoryId) traderWhere.traderCategoryId = query.traderCategoryId;
		if (query.grade) traderWhere.grade = query.grade;
		if (query.pitamStatus) traderWhere.pitamStatus = query.pitamStatus;
		this.applyCombinedOwnerScope(traderWhere, ownerScope, query.traderId);

		// ── Customer where ──
		const customerWhere: Prisma.CustomerAllocationWhereInput = { seasonId, isDeleted: false };
		if (query.customerId) customerWhere.customerId = query.customerId;
		if (query.customerCategoryId) customerWhere.customerCategoryId = query.customerCategoryId;
		if (query.pitamStatus) customerWhere.pitamStatus = query.pitamStatus;

		// Apply movement scope to both sides
		const typeFilter = this.buildCombinedMovementFilter(movementScope);
		if (typeFilter !== undefined) {
			(traderWhere as Record<string, unknown>).type = typeFilter;
			(customerWhere as Record<string, unknown>).type = typeFilter;
		}

		// ── Parallel group-by queries ──
		const [traderGrouped, customerGrouped] = await Promise.all([
			this.prisma.traderStock.groupBy({
				by: ['traderId', 'isModulo', 'traderCategoryId', 'grade', 'pitamStatus'],
				where: traderWhere,
				_sum: { quantity: true },
				_max: { updatedAt: true },
			}),
			this.prisma.customerAllocation.groupBy({
				by: ['customerId', 'customerCategoryId', 'pitamStatus'],
				where: customerWhere,
				_sum: { quantity: true },
				_max: { updatedAt: true },
			}),
		]);

		const traderRows = traderGrouped.filter((r) => (r._sum.quantity ?? 0) !== 0);
		const customerRows = customerGrouped.filter((r) => (r._sum.quantity ?? 0) !== 0);

		// ── Name lookups ──
		const traderIds = traderRows.map((r) => r.traderId).filter((id): id is number => id !== null);
		const traderCatIds = [...new Set(traderRows.map((r) => r.traderCategoryId))];
		const customerIds = [...new Set(customerRows.map((r) => r.customerId))];
		const customerCatIds = [...new Set(customerRows.map((r) => r.customerCategoryId))];

		const [traders, traderCats, customers, customerCats] = await Promise.all([
			traderIds.length
				? this.prisma.trader.findMany({ where: { id: { in: traderIds } }, select: { id: true, name: true } })
				: Promise.resolve([]),
			traderCatIds.length
				? this.prisma.tradersCategories.findMany({ where: { id: { in: traderCatIds } }, select: { id: true, name: true } })
				: Promise.resolve([]),
			customerIds.length
				? this.prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, customerName: true } })
				: Promise.resolve([]),
			customerCatIds.length
				? this.prisma.customerCategories.findMany({ where: { id: { in: customerCatIds } }, select: { id: true, name: true, grade: true } })
				: Promise.resolve([]),
		]);

		const traderMap = new Map(traders.map((t): [number, string] => [t.id, t.name]));
		const traderCatMap = new Map(traderCats.map((c): [number, string] => [c.id, c.name]));
		const customerMap = new Map(customers.map((c): [number, string] => [c.id, c.customerName]));
		const customerCatMap = new Map(customerCats.map((c): [number, { name: string; grade: string | null }] => [c.id, { name: c.name, grade: c.grade }]));

		// ── Map to response rows ──
		const mappedTraderRows = traderRows.map((row) => ({
			traderId: row.traderId,
			traderName: row.isModulo ? 'MODULO' : (row.traderId ? (traderMap.get(row.traderId) ?? null) : null),
			isModulo: row.isModulo,
			traderCategoryId: row.traderCategoryId,
			traderCategoryName: traderCatMap.get(row.traderCategoryId) ?? null,
			grade: row.grade,
			pitamStatus: row.pitamStatus,
			quantity: row._sum.quantity ?? 0,
			lastUpdatedAt: row._max.updatedAt,
		}));

		const mappedCustomerRows = customerRows.map((row) => {
			const cat = customerCatMap.get(row.customerCategoryId);
			return {
				customerId: row.customerId,
				customerName: customerMap.get(row.customerId) ?? null,
				customerCategoryId: row.customerCategoryId,
				customerCategoryName: cat?.name ?? null,
				categoryGrade: cat?.grade ?? null,
				pitamStatus: row.pitamStatus,
				quantity: row._sum.quantity ?? 0,
				lastUpdatedAt: row._max.updatedAt,
			};
		});

		// ── Totals ──
		const traderSubtotals = mappedTraderRows.reduce(
			(acc, row) => {
				acc.totalQuantity += row.quantity;
				if (row.isModulo) acc.moduloQuantity += row.quantity;
				else acc.traderQuantity += row.quantity;
				return acc;
			},
			{ totalQuantity: 0, moduloQuantity: 0, traderQuantity: 0 },
		);

		const customerSubtotals = {
			totalQuantity: mappedCustomerRows.reduce((acc, r) => acc + r.quantity, 0),
		};

		return {
			trader: { rows: mappedTraderRows, subtotals: traderSubtotals },
			customer: { rows: mappedCustomerRows, subtotals: customerSubtotals },
			grandTotal: traderSubtotals.totalQuantity + customerSubtotals.totalQuantity,
		};
	}

	private validateCombinedQuery(ownerScope: string, movementScope: string, traderId?: number) {
		if (!['ALL', 'TRADER', 'MODULO'].includes(ownerScope)) {
			throw new BadRequestException('ownerScope must be ALL, TRADER, or MODULO');
		}
		const validScopes: CombinedMovementScope[] = [
			'ALL', 'SHIPPED', 'UNSHIPPED',
			'PACKED_SHIPPED', 'SELF_PICKUP',
			'HARVEST_IN', 'INTERNAL_TRANSFER', 'OWNERSHIP_TRANSFER', 'ASSIGNED',
			'WASTE', 'ADJUSTMENT',
		];
		if (!validScopes.includes(movementScope as CombinedMovementScope)) {
			throw new BadRequestException('movementScope must be one of: ' + validScopes.join(', '));
		}
		if (ownerScope === 'TRADER' && !traderId) {
			throw new BadRequestException('traderId is required when ownerScope=TRADER');
		}
	}

	private applyCombinedOwnerScope(
		where: Prisma.TraderStockWhereInput,
		ownerScope: string,
		traderId?: number,
	) {
		if (ownerScope === 'TRADER') {
			where.isModulo = false;
			where.traderId = traderId;
		} else if (ownerScope === 'MODULO') {
			where.isModulo = true;
			where.traderId = null;
		} else if (traderId) {
			where.isModulo = false;
			where.traderId = traderId;
		}
	}

	private buildCombinedMovementFilter(scope: CombinedMovementScope) {
		if (scope === 'ALL') return undefined;
		if (scope === 'SHIPPED') return { in: [MovementType.PACKED_SHIPPED, MovementType.SELF_PICKUP] };
		if (scope === 'UNSHIPPED') return { notIn: [MovementType.PACKED_SHIPPED, MovementType.SELF_PICKUP] };
		const exactMap: Partial<Record<CombinedMovementScope, MovementType>> = {
			PACKED_SHIPPED: MovementType.PACKED_SHIPPED,
			SELF_PICKUP: MovementType.SELF_PICKUP,
			HARVEST_IN: MovementType.HARVEST_IN,
			INTERNAL_TRANSFER: MovementType.INTERNAL_TRANSFER,
			OWNERSHIP_TRANSFER: MovementType.OWNERSHIP_TRANSFER,
			ASSIGNED: MovementType.ASSIGNED,
			WASTE: MovementType.WASTE,
			ADJUSTMENT: MovementType.ADJUSTMENT,
		};
		return exactMap[scope];
	}

	private validateTransferDto(data: InternalTransferRequest) {
		this.assertSupportedTransferType(data.type);
		this.assertOwnerFlow(data);

		if (!Number.isFinite(data.quantity) || data.quantity <= 0) {
			throw new BadRequestException('quantity must be a positive number');
		}

		if (!data.date) {
			throw new BadRequestException('date is required');
		}

		if (data.fromOwnerType === InventoryOwnerType.MODULO && data.fromTraderId) {
			throw new BadRequestException('fromTraderId must be empty when fromOwnerType is MODULO');
		}

		if (data.toOwnerType === InventoryOwnerType.MODULO) {
			throw new BadRequestException('toOwnerType MODULO is not supported for transfer target');
		}

		if (this.usesCustomerLedger(data.fromOwnerType) || this.usesCustomerLedger(data.toOwnerType)) {
			if (!data.dateHebrew) {
				throw new BadRequestException('dateHebrew is required for customer movements');
			}
		}

		if (data.fromOwnerType === InventoryOwnerType.TRADER && !data.fromTraderId) {
			throw new BadRequestException('fromTraderId is required when fromOwnerType=TRADER');
		}

		if (data.fromOwnerType === InventoryOwnerType.CUSTOMER && !data.fromCustomerId) {
			throw new BadRequestException('fromCustomerId is required when fromOwnerType=CUSTOMER');
		}

		if (data.toOwnerType === InventoryOwnerType.TRADER && !data.toTraderId) {
			throw new BadRequestException('toTraderId is required when toOwnerType=TRADER');
		}

		if (data.toOwnerType === InventoryOwnerType.CUSTOMER && !data.toCustomerId) {
			throw new BadRequestException('toCustomerId is required when toOwnerType=CUSTOMER');
		}

		this.resolveTransferSideSpec(data, 'from');
		this.resolveTransferSideSpec(data, 'to');
	}

	private assertSupportedTransferType(type: MovementType) {
		switch (type) {
			case MovementType.INTERNAL_TRANSFER:
			case MovementType.OWNERSHIP_TRANSFER:
			case MovementType.ASSIGNED:
				return;
			default:
				throw new BadRequestException(`Unsupported transfer type: ${type}`);
		}
	}

	private validateCustomerGeneralAllocationDto(data: CustomerGeneralAllocationRequest) {
		if (!Number.isFinite(data.quantity) || data.quantity <= 0 || !Number.isInteger(data.quantity)) {
			throw new BadRequestException('quantity must be a positive integer');
		}

		if (!data.date) {
			throw new BadRequestException('date is required');
		}

		if (!data.dateHebrew) {
			throw new BadRequestException('dateHebrew is required');
		}

		if (!data.customerId) {
			throw new BadRequestException('customerId is required');
		}

		if (!data.customerCategoryId) {
			throw new BadRequestException('customerCategoryId is required');
		}

		if (!data.traderCategoryId) {
			throw new BadRequestException('traderCategoryId is required');
		}

		if (!data.grade) {
			throw new BadRequestException('grade is required');
		}

		if (!data.pitamStatus) {
			throw new BadRequestException('pitamStatus is required');
		}
	}

	private calculateMinimalGrossByShares(deficit: number, sharePercents: string[]) {
		const deficitBig = BigInt(deficit);
		const hundred = 100n;

		let step = 1n;
		for (const percentText of sharePercents) {
			const fraction = this.decimalToFraction(percentText);
			if (fraction.numerator <= 0n) {
				throw new BadRequestException('All trader shares must be positive numbers');
			}

			const denominator = hundred * fraction.denominator;
			const unitStep = denominator / this.gcd(fraction.numerator, denominator);
			step = this.lcm(step, unitStep);
		}

		const gross = ((deficitBig + step - 1n) / step) * step;
		if (gross > BigInt(Number.MAX_SAFE_INTEGER)) {
			throw new BadRequestException('Calculated gross quantity is too large');
		}

		return Number(gross);
	}

	private calculateExactShareQuantity(total: number, percentText: string) {
		const totalBig = BigInt(total);
		const fraction = this.decimalToFraction(percentText);
		const numerator = totalBig * fraction.numerator;
		const denominator = 100n * fraction.denominator;

		if (numerator % denominator !== 0n) {
			throw new BadRequestException('Share distribution produced non-integer quantity');
		}

		const value = numerator / denominator;
		if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
			throw new BadRequestException('Calculated share quantity is too large');
		}

		return Number(value);
	}

	private decimalToFraction(value: string) {
		const normalized = value.trim();
		if (!/^\d+(\.\d+)?$/.test(normalized)) {
			throw new BadRequestException(`Invalid share percent value: ${value}`);
		}

		const parts = normalized.split('.');
		if (parts.length === 1) {
			return { numerator: BigInt(parts[0]), denominator: 1n };
		}

		const whole = parts[0];
		const frac = parts[1];
		const denominator = 10n ** BigInt(frac.length);
		const numerator = BigInt(whole + frac);
		const divisor = this.gcd(numerator, denominator);

		return {
			numerator: numerator / divisor,
			denominator: denominator / divisor,
		};
	}

	private gcd(a: bigint, b: bigint): bigint {
		let left = a < 0n ? -a : a;
		let right = b < 0n ? -b : b;

		while (right !== 0n) {
			const temp = left % right;
			left = right;
			right = temp;
		}

		return left;
	}

	private lcm(a: bigint, b: bigint): bigint {
		if (a === 0n || b === 0n) {
			return 0n;
		}

		return (a / this.gcd(a, b)) * b;
	}

	private assertOwnerFlow(data: InternalTransferRequest) {
		if (data.type === MovementType.INTERNAL_TRANSFER) {
			const valid =
				(data.fromOwnerType === InventoryOwnerType.TRADER && data.toOwnerType === InventoryOwnerType.CUSTOMER) ||
				(data.fromOwnerType === InventoryOwnerType.CUSTOMER && data.toOwnerType === InventoryOwnerType.TRADER);

			if (!valid) {
				throw new BadRequestException('INTERNAL_TRANSFER must be between TRADER and CUSTOMER');
			}
			return;
		}

		if (data.type === MovementType.OWNERSHIP_TRANSFER) {
			if (data.fromOwnerType !== InventoryOwnerType.TRADER || data.toOwnerType !== InventoryOwnerType.TRADER) {
				throw new BadRequestException('OWNERSHIP_TRANSFER must be TRADER -> TRADER');
			}
			if (data.fromTraderId === data.toTraderId) {
				throw new BadRequestException('fromTraderId and toTraderId must be different for OWNERSHIP_TRANSFER');
			}
			return;
		}

		if (data.fromOwnerType !== InventoryOwnerType.MODULO || data.toOwnerType !== InventoryOwnerType.TRADER) {
			throw new BadRequestException('ASSIGNED manual flow must be MODULO -> TRADER');
		}
	}

	private buildTransferPayloads(seasonId: number, data: InternalTransferRequest, actorId: number) {
		const absoluteQuantity = Math.abs(data.quantity);

		return {
			negative: this.buildLedgerCreateData(data, seasonId, -absoluteQuantity, 'from', actorId),
			positive: this.buildLedgerCreateData(data, seasonId, absoluteQuantity, 'to', actorId),
		};
	}

	private buildLedgerCreateData(
		data: InternalTransferRequest,
		seasonId: number,
		signedQuantity: number,
		side: 'from' | 'to',
		actorId: number,
	) {
		const ownerType = side === 'from' ? data.fromOwnerType : data.toOwnerType;
		const sideSpec = this.resolveTransferSideSpec(data, side);

		if (ownerType === InventoryOwnerType.TRADER || ownerType === InventoryOwnerType.MODULO) {
			return {
				table: 'traderStock' as const,
				payload: {
					seasonId,
					date: new Date(data.date),
					traderId: ownerType === InventoryOwnerType.MODULO ? null : side === 'from' ? data.fromTraderId! : data.toTraderId!,
					traderCategoryId: sideSpec.traderCategoryId!,
					grade: sideSpec.grade!,
					pitamStatus: sideSpec.pitamStatus,
					quantity: signedQuantity,
					isModulo: ownerType === InventoryOwnerType.MODULO,
					type: data.type,
					shipmentId: null,
					boxId: null,
					notes: data.notes,
					updatedById: actorId,
				},
			};
		}

		return {
			table: 'customerAllocation' as const,
			payload: {
				seasonId,
				date: new Date(data.date),
				dateHebrew: data.dateHebrew!,
				customerId: side === 'from' ? data.fromCustomerId! : data.toCustomerId!,
				customerCategoryId: sideSpec.customerCategoryId!,
				pitamStatus: sideSpec.pitamStatus,
				quantity: signedQuantity,
				type: data.type,
				takenFrom: this.resolveTakenFrom(data, side),
				traderId: this.resolveTraderSourceId(data, side),
				shipmentId: null,
				boxId: null,
				notes: data.notes,
				updatedById: actorId,
			},
		};
	}

	private resolveTakenFrom(data: InternalTransferRequest, side: 'from' | 'to'): SourceType {
		const oppositeOwner = side === 'from' ? data.toOwnerType : data.fromOwnerType;
		return oppositeOwner === InventoryOwnerType.TRADER ? SourceType.TRADER : SourceType.GENERAL;
	}

	private resolveTraderSourceId(data: InternalTransferRequest, side: 'from' | 'to') {
		const oppositeOwner = side === 'from' ? data.toOwnerType : data.fromOwnerType;
		if (oppositeOwner === InventoryOwnerType.TRADER) {
			return side === 'from' ? data.toTraderId ?? null : data.fromTraderId ?? null;
		}

		return null;
	}

	private resolveTransferSideSpec(data: InternalTransferRequest, side: 'from' | 'to'): TransferSideSpec {
		const ownerType = side === 'from' ? data.fromOwnerType : data.toOwnerType;

			       // קובע את pitamStatus רק לפי fromPitamStatus, לא מהקלט של המשתמש
			       const pitamStatus = data.fromPitamStatus;
			       if (!pitamStatus) {
				       throw new BadRequestException(`${side}PitamStatus is required`);
			       }

		if (ownerType === InventoryOwnerType.TRADER || ownerType === InventoryOwnerType.MODULO) {
			const traderCategoryId =
				side === 'from'
					? (data.fromTraderCategoryId ?? data.traderCategoryId)
					: (data.toTraderCategoryId ?? data.traderCategoryId);
			const grade = side === 'from' ? (data.fromGrade ?? data.grade) : (data.toGrade ?? data.grade);

			if (!traderCategoryId) {
				throw new BadRequestException(`${side}TraderCategoryId is required for trader/modulo movements`);
			}

			if (!grade) {
				throw new BadRequestException(`${side}Grade is required for trader/modulo movements`);
			}

			return {
				pitamStatus,
				traderCategoryId,
				grade,
			};
		}

		const customerCategoryId =
			side === 'from'
				? (data.fromCustomerCategoryId ?? data.customerCategoryId)
				: (data.toCustomerCategoryId ?? data.customerCategoryId);

		if (!customerCategoryId) {
			throw new BadRequestException(`${side}CustomerCategoryId is required for customer movements`);
		}

		return {
			pitamStatus,
			customerCategoryId,
		};
	}

	private async createTransferPairTx(tx: Prisma.TransactionClient, seasonId: number, data: InternalTransferRequest, actorId: number) {
		const built = this.buildTransferPayloads(seasonId, data, actorId);
		await this.assertNegativeLedgerHasEnoughStockTx(tx, built.negative);

		const negative = await this.createByLedgerTx(tx, built.negative);

		const positive =
			built.positive.table === 'traderStock'
				? await this.createByLedgerTx(tx, {
						table: 'traderStock',
						payload: {
							...built.positive.payload,
							MovementReferenceId: negative.id,
						},
					})
				: await this.createByLedgerTx(tx, {
						table: 'customerAllocation',
						payload: {
							...built.positive.payload,
							MovementReferenceId: negative.id,
						},
					});

		await this.patchReferenceTx(tx, built.negative.table, negative.id, positive.id);

		return {
			operationIds: [negative.id, positive.id],
			negative,
			positive,
		};
	}

	private async getTransferPairTx(tx: Prisma.TransactionClient, operationId: number) {
		const directTrader = await tx.traderStock.findFirst({
			where: {
				id: operationId,
				type: { in: [MovementType.INTERNAL_TRANSFER, MovementType.OWNERSHIP_TRANSFER, MovementType.ASSIGNED] },
				isDeleted: false,
			},
		});

		const directCustomer = await tx.customerAllocation.findFirst({
			where: {
				id: operationId,
				type: { in: [MovementType.INTERNAL_TRANSFER, MovementType.OWNERSHIP_TRANSFER, MovementType.ASSIGNED] },
				isDeleted: false,
			},
		});

		const direct = directTrader ?? directCustomer;
		if (!direct) {
			throw new NotFoundException(`Operation ${operationId} not found`);
		}

		if (!direct.MovementReferenceId) {
			throw new BadRequestException(`Operation ${operationId} has no linked opposite movement`);
		}

		const linkedId = direct.MovementReferenceId;

		const linkedTrader = await tx.traderStock.findFirst({
			where: {
				id: linkedId,
				type: { in: [MovementType.INTERNAL_TRANSFER, MovementType.OWNERSHIP_TRANSFER, MovementType.ASSIGNED] },
				isDeleted: false,
			},
		});

		const linkedCustomer = await tx.customerAllocation.findFirst({
			where: {
				id: linkedId,
				type: { in: [MovementType.INTERNAL_TRANSFER, MovementType.OWNERSHIP_TRANSFER, MovementType.ASSIGNED] },
				isDeleted: false,
			},
		});

		const linked = linkedTrader ?? linkedCustomer;
		if (!linked) {
			throw new BadRequestException(`Operation ${operationId} has invalid linked movement ${linkedId}`);
		}

		if (linked.MovementReferenceId !== direct.id) {
			throw new BadRequestException(
				`Operation link mismatch: ${direct.id} <-> ${linked.id} is not reciprocal via MovementReferenceId`,
			);
		}

		const allRows: TransferLedgerRecord[] = [
			directTrader
				? { table: 'traderStock' as const, record: directTrader }
				: { table: 'customerAllocation' as const, record: directCustomer! },
			linkedTrader
				? { table: 'traderStock' as const, record: linkedTrader }
				: { table: 'customerAllocation' as const, record: linkedCustomer! },
		];

		const negative = allRows.find((entry) => entry.record.quantity < 0);
		const positive = allRows.find((entry) => entry.record.quantity > 0);

		if (!negative || !positive) {
			throw new BadRequestException(`Operation pair (${direct.id}, ${linked.id}) is incomplete and cannot be updated`);
		}

		return { negative, positive };
	}

	private async assertNegativeLedgerHasEnoughStockTx(
		tx: Prisma.TransactionClient,
		negative:
			| { table: 'traderStock'; payload: Prisma.TraderStockUncheckedCreateInput }
			| { table: 'customerAllocation'; payload: Prisma.CustomerAllocationUncheckedCreateInput },
		existingNegative?: TransferLedgerRecord,
	) {
		const requiredQuantity = Math.abs(Number(negative.payload.quantity));
		if (requiredQuantity <= 0) {
			return;
		}

		if (negative.table === 'traderStock') {
			const payload = negative.payload;
			const creditQuantity =
				existingNegative && this.isSameTraderSource(existingNegative, payload)
					? Math.abs(Number(existingNegative.record.quantity))
					: 0;

			await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(tx, {
				seasonId: payload.seasonId,
				traderId: payload.traderId ?? null,
				traderCategoryId: payload.traderCategoryId,
				grade: payload.grade,
				pitamStatus: payload.pitamStatus,
				isModulo: Boolean(payload.isModulo),
				requiredQuantity,
				creditQuantity,
				contextLabel: 'Inventory transfer source check',
			});
			return;
		}

		const payload = negative.payload;
		const creditQuantity =
			existingNegative && this.isSameCustomerSource(existingNegative, payload)
				? Math.abs(Number(existingNegative.record.quantity))
				: 0;

		await this.inventoryAvailabilityService.assertCustomerHasUnshippedStock(tx, {
			seasonId: payload.seasonId,
			customerId: payload.customerId,
			customerCategoryId: payload.customerCategoryId,
			pitamStatus: payload.pitamStatus,
			requiredQuantity,
			creditQuantity,
			contextLabel: 'Inventory transfer source check',
		});
	}

	private isSameTraderSource(
		existingNegative: TransferLedgerRecord,
		nextPayload: Prisma.TraderStockUncheckedCreateInput,
	) {
		if (existingNegative.table !== 'traderStock') {
			return false;
		}

		const current = existingNegative.record;
		return (
			current.seasonId === nextPayload.seasonId
			&& current.traderId === (nextPayload.traderId ?? null)
			&& current.traderCategoryId === nextPayload.traderCategoryId
			&& current.grade === nextPayload.grade
			&& current.pitamStatus === nextPayload.pitamStatus
			&& current.isModulo === nextPayload.isModulo
		);
	}

	private isSameCustomerSource(
		existingNegative: TransferLedgerRecord,
		nextPayload: Prisma.CustomerAllocationUncheckedCreateInput,
	) {
		if (existingNegative.table !== 'customerAllocation') {
			return false;
		}

		const current = existingNegative.record;
		return (
			current.seasonId === nextPayload.seasonId
			&& current.customerId === nextPayload.customerId
			&& current.customerCategoryId === nextPayload.customerCategoryId
			&& current.pitamStatus === nextPayload.pitamStatus
		);
	}

	private async softDeletePairTx(tx: Prisma.TransactionClient, leftId: number, rightId: number) {
		const traderDeleted = await tx.traderStock.updateMany({
			where: {
				isDeleted: false,
				type: { in: [MovementType.INTERNAL_TRANSFER, MovementType.OWNERSHIP_TRANSFER, MovementType.ASSIGNED] },
				id: { in: [leftId, rightId] },
			},
			data: { isDeleted: true },
		});

		const customerDeleted = await tx.customerAllocation.updateMany({
			where: {
				isDeleted: false,
				type: { in: [MovementType.INTERNAL_TRANSFER, MovementType.OWNERSHIP_TRANSFER, MovementType.ASSIGNED] },
				id: { in: [leftId, rightId] },
			},
			data: { isDeleted: true },
		});

		return {
			traderStock: traderDeleted.count,
			customerAllocations: customerDeleted.count,
		};
	}

	private async createByLedgerTx(
		tx: Prisma.TransactionClient,
		data:
			| { table: 'traderStock'; payload: Prisma.TraderStockUncheckedCreateInput }
			| { table: 'customerAllocation'; payload: Prisma.CustomerAllocationUncheckedCreateInput },
	) {
		if (data.table === 'traderStock') {
			return tx.traderStock.create({ data: data.payload });
		}

		return tx.customerAllocation.create({ data: data.payload });
	}

	private async updateByLedgerTx(
		tx: Prisma.TransactionClient,
		row: TransferLedgerRecord,
		data:
			| { table: 'traderStock'; payload: Prisma.TraderStockUncheckedCreateInput }
			| { table: 'customerAllocation'; payload: Prisma.CustomerAllocationUncheckedCreateInput },
		referenceId: number,
	) {
		if (row.table === 'traderStock' && data.table === 'traderStock') {
			return tx.traderStock.update({
				where: { id: row.record.id },
				data: { ...data.payload, MovementReferenceId: referenceId },
			});
		}

		if (row.table === 'customerAllocation' && data.table === 'customerAllocation') {
			return tx.customerAllocation.update({
				where: { id: row.record.id },
				data: { ...data.payload, MovementReferenceId: referenceId },
			});
		}

		throw new BadRequestException('Ledger mismatch while updating transfer operation');
	}

	private async patchReferenceTx(
		tx: Prisma.TransactionClient,
		table: 'traderStock' | 'customerAllocation',
		id: number,
		referenceId: number,
	) {
		if (table === 'traderStock') {
			await tx.traderStock.update({
				where: { id },
				data: { MovementReferenceId: referenceId },
			});
			return;
		}

		await tx.customerAllocation.update({
			where: { id },
			data: { MovementReferenceId: referenceId },
		});
	}

	private usesTraderLedger(ownerType: InventoryOwnerType) {
		return ownerType === InventoryOwnerType.TRADER || ownerType === InventoryOwnerType.MODULO;
	}

	private usesCustomerLedger(ownerType: InventoryOwnerType) {
		return ownerType === InventoryOwnerType.CUSTOMER;
	}

	private getExpectedTables(data: InternalTransferRequest) {
		const tableA = this.usesCustomerLedger(data.fromOwnerType) ? 'customerAllocation' : 'traderStock';
		const tableB = this.usesCustomerLedger(data.toOwnerType) ? 'customerAllocation' : 'traderStock';
		return [tableA, tableB].sort().join('|');
	}
}
