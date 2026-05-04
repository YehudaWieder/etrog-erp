import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MovementType, PitamStatus, Grade, Prisma, SourceType } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { SeasonsService } from 'src/seasons/seasons.service';

export enum InventoryOwnerType {
	TRADER = 'TRADER',
	CUSTOMER = 'CUSTOMER',
	MODULO = 'MODULO',
}

export class InternalTransferRequest {
	type!: MovementType;
	date!: string;
	dateHebrew?: string;
	quantity!: number;
	pitamStatus!: PitamStatus;
	grade?: Grade;
	traderCategoryId?: number;
	customerCategoryId?: number;
	fromOwnerType!: InventoryOwnerType;
	fromTraderId?: number;
	fromCustomerId?: number;
	toOwnerType!: InventoryOwnerType;
	toTraderId?: number;
	toCustomerId?: number;
	updatedById!: number;
	notes?: string;
}

type TransferLedgerRecord =
	| { table: 'traderStock'; record: Prisma.TraderStockGetPayload<{}> }
	| { table: 'customerAllocation'; record: Prisma.CustomerAllocationGetPayload<{}> };

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
	) {}

	async createInternalTransfer(data: InternalTransferRequest) {
		this.validateTransferDto(data);
		const { id: seasonId } = await this.seasonsService.findActiveSeason();

		return this.prisma.$transaction(async (tx) => {
			return this.createTransferPairTx(tx, seasonId, data);
		});
	}

	async updateInternalTransfer(operationId: number, data: InternalTransferRequest) {
		this.validateTransferDto(data);

		return this.prisma.$transaction(async (tx) => {
			const pair = await this.getTransferPairTx(tx, operationId);
			const { id: seasonId } = await this.seasonsService.findActiveSeason();

			const expectedTables = this.getExpectedTables(data);
			const existingTables = [pair.negative.table, pair.positive.table].sort().join('|');

			if (expectedTables !== existingTables) {
				await this.softDeletePairTx(tx, pair.negative.record.id, pair.positive.record.id);
				return this.createTransferPairTx(tx, seasonId, data);
			}

			const rebuilt = this.buildTransferPayloads(seasonId, data);

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

		if (!Number.isFinite(data.quantity) || data.quantity <= 0) {
			throw new BadRequestException('quantity must be a positive number');
		}

		if (data.fromOwnerType === InventoryOwnerType.MODULO && data.fromTraderId) {
			throw new BadRequestException('fromTraderId must be empty when fromOwnerType is MODULO');
		}

		if (data.toOwnerType === InventoryOwnerType.MODULO) {
			throw new BadRequestException('toOwnerType MODULO is not supported for transfer target');
		}

		if (this.usesTraderLedger(data.fromOwnerType) || this.usesTraderLedger(data.toOwnerType)) {
			if (!data.traderCategoryId) {
				throw new BadRequestException('traderCategoryId is required for trader/modulo movements');
			}
			if (!data.grade) {
				throw new BadRequestException('grade is required for trader/modulo movements');
			}
		}

		if (this.usesCustomerLedger(data.fromOwnerType) || this.usesCustomerLedger(data.toOwnerType)) {
			if (!data.customerCategoryId) {
				throw new BadRequestException('customerCategoryId is required for customer movements');
			}
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

		this.assertOwnerFlow(data);
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

	private buildTransferPayloads(seasonId: number, data: InternalTransferRequest) {
		const absoluteQuantity = Math.abs(data.quantity);

		return {
			negative: this.buildLedgerCreateData(data, seasonId, -absoluteQuantity, 'from'),
			positive: this.buildLedgerCreateData(data, seasonId, absoluteQuantity, 'to'),
		};
	}

	private buildLedgerCreateData(
		data: InternalTransferRequest,
		seasonId: number,
		signedQuantity: number,
		side: 'from' | 'to',
	) {
		const ownerType = side === 'from' ? data.fromOwnerType : data.toOwnerType;

		if (ownerType === InventoryOwnerType.TRADER || ownerType === InventoryOwnerType.MODULO) {
			return {
				table: 'traderStock' as const,
				payload: {
					seasonId,
					date: new Date(data.date),
					traderId: ownerType === InventoryOwnerType.MODULO ? null : side === 'from' ? data.fromTraderId! : data.toTraderId!,
					traderCategoryId: data.traderCategoryId!,
					grade: data.grade!,
					pitamStatus: data.pitamStatus,
					quantity: signedQuantity,
					isModulo: ownerType === InventoryOwnerType.MODULO,
					type: data.type,
					shipmentId: null,
					boxId: null,
					notes: data.notes,
					updatedById: data.updatedById,
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
				customerCategoryId: data.customerCategoryId!,
				pitamStatus: data.pitamStatus,
				quantity: signedQuantity,
				type: data.type,
				takenFrom: this.resolveTakenFrom(data, side),
				traderId: this.resolveTraderSourceId(data, side),
				shipmentId: null,
				boxId: null,
				notes: data.notes,
				updatedById: data.updatedById,
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

	private async createTransferPairTx(tx: Prisma.TransactionClient, seasonId: number, data: InternalTransferRequest) {
		const built = this.buildTransferPayloads(seasonId, data);

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
