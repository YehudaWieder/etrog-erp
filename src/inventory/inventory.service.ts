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
