// src/inventory/services/trader-stock/trader-stock.service.ts

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, MovementType, Grade, PitamStatus } from 'src/generated/prisma';
import { SeasonsService } from 'src/seasons/seasons.service';
import { InventoryAvailabilityService } from '../inventory-availability.service';

export type InventoryOwnerScope = 'ALL' | 'TRADER' | 'MODULO';
export type InventoryShipmentScope =
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
export type InventorySortBy = 'category' | 'trader' | 'quantity' | 'grade' | 'pitamStatus' | 'updatedAt';
export type InventorySortOrder = 'asc' | 'desc';

export interface InventorySummaryQuery {
    seasonId?: number;
    traderId?: number;
    traderCategoryId?: number;
    grade?: Grade;
    pitamStatus?: PitamStatus;
    ownerScope?: InventoryOwnerScope;
    shipmentScope?: InventoryShipmentScope;
    sortBy?: InventorySortBy;
    sortOrder?: InventorySortOrder;
}

export interface InventorySummaryTotals {
    totalQuantity: number;
    moduloQuantity: number;
    traderQuantity: number;
}

export interface InventorySummaryResult {
    rows: InventorySummaryRow[];
    totals: InventorySummaryTotals;
}

export interface InventorySummaryRow {
    traderId: number | null;
    traderName: string | null;
    isModulo: boolean;
    traderCategoryId: number;
    traderCategoryName: string | null;
    grade: Grade;
    pitamStatus: PitamStatus;
    quantity: number;
    lastUpdatedAt: Date | null;
}

@Injectable()
export class TraderStockService {
    constructor(
        private prisma: PrismaService,
        private seasonsService: SeasonsService,
        private inventoryAvailabilityService: InventoryAvailabilityService,
    ) {}

    // Create a new stock movement
    async createMovement(data: Prisma.TraderStockUncheckedCreateInput, actorId: number) {
        const createPayload: Prisma.TraderStockUncheckedCreateInput = {
            ...data,
            updatedById: actorId,
        };

        const { id: seasonId } = await this.seasonsService.findActiveSeason();

        await this.assertNegativeTraderMovementHasStock(this.prisma, {
            ...createPayload,
            seasonId,
        });

        return this.prisma.traderStock.create({
            data: {
                ...createPayload,
                seasonId,
            },
        });
    }

    // Get all movements for a specific trader and category in a season
    async getMovementHistory(seasonId: number, traderId: number, traderCategoryId: number) {
        await this.seasonsService.assertSeasonExists(seasonId);

        return this.prisma.traderStock.findMany({
        where: {
            seasonId,
            traderId,
            traderCategoryId,
            isDeleted: false,
        },
        orderBy: { date: 'desc' },
        include: {
            updatedBy: { select: { name: true } },
        },
        });
    }

    // Get the current stock balance for a trader and category in a season
    async getBalance(query: {
        seasonId: number;
        traderId?: number;
        traderCategoryId: number;
        grade: any;
        pitamStatus: any;
    }) {
        const aggregation = await this.prisma.traderStock.aggregate({
        where: {
            ...query,
            isDeleted: false,
        },
        _sum: {
            quantity: true,
        },
        });

        return aggregation._sum.quantity || 0;
    }

    // Get full ledger for transparency
    async getLedger(seasonId: number, traderId: number) {
        await this.seasonsService.assertSeasonExists(seasonId);

        return this.prisma.traderStock.findMany({
        where: { seasonId, traderId, isDeleted: false },
        include: {
            traderCategory: { select: { name: true } },
            updatedBy: { select: { name: true } }
        },
        orderBy: { date: 'desc' }
        });
    }

    // Find movements by reference (e.g., all stock records created by a specific shipment)
    async findByReference(referenceId: number) {
        return this.prisma.traderStock.findMany({
        where: { MovementReferenceId: referenceId, isDeleted: false },
        });
    }

    async update(id: number, data: Prisma.TraderStockUncheckedUpdateInput) {
        return this.prisma.traderStock.update({
        where: { id },
        data,
        });
    }

    async getInventorySummary(query: InventorySummaryQuery) {
        const seasonId = query.seasonId ?? (await this.seasonsService.findActiveSeason()).id;
        await this.seasonsService.assertSeasonExists(seasonId);

        const ownerScope = query.ownerScope ?? 'ALL';
        const shipmentScope = query.shipmentScope ?? 'ALL';
        const sortBy = query.sortBy ?? 'category';
        const sortOrder = query.sortOrder ?? 'asc';

        this.validateSummaryQuery(query, ownerScope, shipmentScope, sortBy, sortOrder);

        const where: Prisma.TraderStockWhereInput = {
            seasonId,
            isDeleted: false,
            traderCategoryId: query.traderCategoryId,
            grade: query.grade,
            pitamStatus: query.pitamStatus,
        };

        this.applyOwnerScope(where, ownerScope, query.traderId);
        this.applyShipmentScope(where, shipmentScope);

        const rows = await this.prisma.traderStock.groupBy({
            by: ['traderId', 'isModulo', 'traderCategoryId', 'grade', 'pitamStatus'],
            where,
            _sum: { quantity: true },
            _max: { updatedAt: true },
        });

        const filteredRows = rows.filter((row) => (row._sum.quantity ?? 0) !== 0);

        const traderIds = filteredRows
            .map((row) => row.traderId)
            .filter((traderId): traderId is number => traderId !== null);
        const categoryIds = [...new Set(filteredRows.map((row) => row.traderCategoryId))];

        const [traders, categories] = await Promise.all([
            traderIds.length
                ? this.prisma.trader.findMany({
                    where: { id: { in: traderIds } },
                    select: { id: true, name: true },
                })
                : Promise.resolve([]),
            categoryIds.length
                ? this.prisma.tradersCategories.findMany({
                    where: { id: { in: categoryIds } },
                    select: { id: true, name: true },
                })
                : Promise.resolve([]),
        ]);

        const traderMap = new Map<number, string>();
        for (const trader of traders) {
            traderMap.set(trader.id, trader.name);
        }

        const categoryMap = new Map<number, string>();
        for (const category of categories) {
            categoryMap.set(category.id, category.name);
        }

        const summary: InventorySummaryRow[] = filteredRows.map((row) => ({
            traderId: row.traderId,
            traderName: row.isModulo ? 'MODULO' : row.traderId ? traderMap.get(row.traderId) ?? null : null,
            isModulo: row.isModulo,
            traderCategoryId: row.traderCategoryId,
            traderCategoryName: categoryMap.get(row.traderCategoryId) ?? null,
            grade: row.grade,
            pitamStatus: row.pitamStatus,
            quantity: row._sum.quantity ?? 0,
            lastUpdatedAt: row._max.updatedAt,
        }));

        const sorted = this.sortSummary(summary, sortBy, sortOrder);

        const totals: InventorySummaryTotals = sorted.reduce(
            (acc, row) => {
                acc.totalQuantity += row.quantity;
                if (row.isModulo) {
                    acc.moduloQuantity += row.quantity;
                } else {
                    acc.traderQuantity += row.quantity;
                }
                return acc;
            },
            { totalQuantity: 0, moduloQuantity: 0, traderQuantity: 0 },
        );

        return { rows: sorted, totals };
    }

    async createAdjustment(data: Prisma.TraderStockUncheckedCreateInput, actorId: number) {
        const createPayload: Prisma.TraderStockUncheckedCreateInput = {
            ...data,
            updatedById: actorId,
        };

        this.validateAdjustmentType(createPayload.type);
        const { id: seasonId } = await this.seasonsService.findActiveSeason();
        const movementType = createPayload.type as MovementType;
        const quantity = this.requireQuantity(createPayload.quantity);
        const normalizedQuantity = this.normalizeAdjustmentQuantity(movementType, quantity);

        return this.prisma.$transaction(async (tx) => {
            await this.assertNegativeTraderMovementHasStock(tx, {
                ...createPayload,
                seasonId,
                quantity: normalizedQuantity,
            });

            return tx.traderStock.create({
                data: {
                    ...createPayload,
                    seasonId,
                    quantity: normalizedQuantity,
                    shipmentId: null,
                    boxId: null,
                },
            });
        });
    }

    async updateAdjustment(id: number, data: Prisma.TraderStockUncheckedUpdateInput, actorId: number) {
        const updatePayload: Prisma.TraderStockUncheckedUpdateInput = {
            ...data,
            updatedById: actorId,
        };

        return this.prisma.$transaction(async (tx) => {
            const existing = await tx.traderStock.findFirst({
                where: {
                    id,
                    isDeleted: false,
                    type: { in: [MovementType.WASTE, MovementType.ADJUSTMENT, MovementType.SELF_PICKUP] },
                },
            });

            if (!existing) {
                throw new NotFoundException(`Trader adjustment ${id} not found`);
            }

            const nextType = (updatePayload.type ?? existing.type) as MovementType;
            this.validateAdjustmentType(nextType);

            const nextQuantityRaw =
                updatePayload.quantity === undefined ? existing.quantity : Number(updatePayload.quantity);
            const nextQuantity =
                updatePayload.quantity === undefined
                    ? existing.quantity
                    : this.normalizeAdjustmentQuantity(nextType, nextQuantityRaw);

            await this.assertNegativeTraderMovementHasStock(tx, {
                seasonId: existing.seasonId,
                traderId: (updatePayload.traderId ?? existing.traderId) as number | null,
                traderCategoryId: Number(updatePayload.traderCategoryId ?? existing.traderCategoryId),
                grade: (updatePayload.grade ?? existing.grade) as Grade,
                pitamStatus: (updatePayload.pitamStatus ?? existing.pitamStatus) as PitamStatus,
                isModulo: Boolean(updatePayload.isModulo ?? existing.isModulo),
                quantity: nextQuantity,
            }, Math.abs(existing.quantity));

            return tx.traderStock.update({
                where: { id },
                data: {
                    ...updatePayload,
                    shipmentId: null,
                    boxId: null,
                    quantity: updatePayload.quantity === undefined ? undefined : nextQuantity,
                },
            });
        });
    }

    async removeAdjustment(id: number) {
        return this.prisma.$transaction(async (tx) => {
            const existing = await tx.traderStock.findFirst({
                where: {
                    id,
                    isDeleted: false,
                    type: { in: [MovementType.WASTE, MovementType.ADJUSTMENT, MovementType.SELF_PICKUP] },
                },
            });

            if (!existing) {
                throw new NotFoundException(`Trader adjustment ${id} not found`);
            }

            return tx.traderStock.update({
                where: { id },
                data: { isDeleted: true },
            });
        });
    }

    // Hard delete a movement
    async remove(id: number) {
        return this.prisma.traderStock.delete({
        where: { id },
        });
    }

    private validateAdjustmentType(type?: MovementType | null) {
        if (!type) {
            throw new BadRequestException('type is required for adjustment movement');
        }

        if (type !== MovementType.WASTE && type !== MovementType.ADJUSTMENT && type !== MovementType.SELF_PICKUP) {
            throw new BadRequestException('type must be WASTE, ADJUSTMENT, or SELF_PICKUP');
        }
    }

    private normalizeAdjustmentQuantity(type: MovementType, quantity: number) {
        if (!Number.isFinite(quantity) || quantity === 0) {
            throw new BadRequestException('quantity must be a non-zero number');
        }

        if (type === MovementType.WASTE || type === MovementType.SELF_PICKUP) {
            return -Math.abs(quantity);
        }

        return quantity;
    }

    private requireQuantity(value?: number) {
        if (value === undefined || value === null) {
            throw new BadRequestException('quantity is required for adjustment movement');
        }

        return Number(value);
    }

    private async assertNegativeTraderMovementHasStock(
        client: Prisma.TransactionClient | PrismaService,
        data: {
            seasonId: number;
            traderId?: number | null;
            traderCategoryId?: number;
            grade?: Grade | null;
            pitamStatus?: PitamStatus;
            isModulo?: boolean;
            quantity?: number;
        },
        creditQuantity: number = 0,
    ) {
        const quantity = Number(data.quantity ?? 0);
        if (!Number.isFinite(quantity) || quantity >= 0) {
            return;
        }

        if (!data.traderCategoryId || !data.grade || !data.pitamStatus) {
            throw new BadRequestException('Negative trader movement requires traderCategoryId, grade, and pitamStatus');
        }

        const isModulo = Boolean(data.isModulo);
        if (isModulo && data.traderId !== null && data.traderId !== undefined) {
            throw new BadRequestException('Modulo movements must use traderId=null');
        }

        if (!isModulo && (data.traderId === null || data.traderId === undefined)) {
            throw new BadRequestException('Trader movement requires traderId when isModulo=false');
        }

        await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(client, {
            seasonId: data.seasonId,
            traderId: isModulo ? null : (data.traderId as number),
            traderCategoryId: data.traderCategoryId,
            grade: data.grade,
            pitamStatus: data.pitamStatus,
            isModulo,
            requiredQuantity: Math.abs(quantity),
            creditQuantity,
            contextLabel: 'Trader movement validation',
        });
    }

    private validateSummaryQuery(
        query: InventorySummaryQuery,
        ownerScope: InventoryOwnerScope,
        shipmentScope: InventoryShipmentScope,
        sortBy: InventorySortBy,
        sortOrder: InventorySortOrder,
    ) {
        if (!['ALL', 'TRADER', 'MODULO'].includes(ownerScope)) {
            throw new BadRequestException('ownerScope must be ALL, TRADER, or MODULO');
        }

        const validShipmentScopes: InventoryShipmentScope[] = [
            'ALL', 'SHIPPED', 'UNSHIPPED',
            'PACKED_SHIPPED', 'SELF_PICKUP',
            'HARVEST_IN', 'INTERNAL_TRANSFER', 'OWNERSHIP_TRANSFER', 'ASSIGNED',
            'WASTE', 'ADJUSTMENT',
        ];
        if (!validShipmentScopes.includes(shipmentScope)) {
            throw new BadRequestException(
                'shipmentScope must be one of: ALL, SHIPPED, UNSHIPPED, PACKED_SHIPPED, SELF_PICKUP, HARVEST_IN, INTERNAL_TRANSFER, OWNERSHIP_TRANSFER, ASSIGNED, WASTE, ADJUSTMENT',
            );
        }

        if (!['category', 'trader', 'quantity', 'grade', 'pitamStatus', 'updatedAt'].includes(sortBy)) {
            throw new BadRequestException('sortBy must be category, trader, quantity, grade, pitamStatus, or updatedAt');
        }

        if (!['asc', 'desc'].includes(sortOrder)) {
            throw new BadRequestException('sortOrder must be asc or desc');
        }

        if (ownerScope === 'TRADER' && !query.traderId) {
            throw new BadRequestException('traderId is required when ownerScope=TRADER');
        }

        if (ownerScope === 'MODULO' && query.traderId) {
            throw new BadRequestException('traderId must be empty when ownerScope=MODULO');
        }
    }

    private applyOwnerScope(where: Prisma.TraderStockWhereInput, ownerScope: InventoryOwnerScope, traderId?: number) {
        if (ownerScope === 'TRADER') {
            where.isModulo = false;
            where.traderId = traderId;
            return;
        }

        if (ownerScope === 'MODULO') {
            where.isModulo = true;
            where.traderId = null;
            return;
        }

        if (traderId) {
            where.isModulo = false;
            where.traderId = traderId;
        }
    }

    private applyShipmentScope(where: Prisma.TraderStockWhereInput, shipmentScope: InventoryShipmentScope) {
        // Logical groups
        if (shipmentScope === 'SHIPPED') {
            where.type = { in: [MovementType.PACKED_SHIPPED, MovementType.SELF_PICKUP] };
            return;
        }
        if (shipmentScope === 'UNSHIPPED') {
            where.type = { notIn: [MovementType.PACKED_SHIPPED, MovementType.SELF_PICKUP] };
            return;
        }
        // Exact movement type matches
        const exactMap: Partial<Record<InventoryShipmentScope, MovementType>> = {
            PACKED_SHIPPED: MovementType.PACKED_SHIPPED,
            SELF_PICKUP: MovementType.SELF_PICKUP,
            HARVEST_IN: MovementType.HARVEST_IN,
            INTERNAL_TRANSFER: MovementType.INTERNAL_TRANSFER,
            OWNERSHIP_TRANSFER: MovementType.OWNERSHIP_TRANSFER,
            ASSIGNED: MovementType.ASSIGNED,
            WASTE: MovementType.WASTE,
            ADJUSTMENT: MovementType.ADJUSTMENT,
        };
        const exact = exactMap[shipmentScope];
        if (exact) {
            where.type = exact;
        }
        // ALL → no type filter applied
    }

    private sortSummary(
        summary: InventorySummaryRow[],
        sortBy: InventorySortBy,
        sortOrder: InventorySortOrder,
    ) {
        const factor = sortOrder === 'asc' ? 1 : -1;

        return summary.sort((left, right) => {
            switch (sortBy) {
                case 'trader':
                    return this.compareValues(left.traderName ?? '', right.traderName ?? '', factor);
                case 'quantity':
                    return this.compareValues(left.quantity, right.quantity, factor);
                case 'grade':
                    return this.compareValues(left.grade, right.grade, factor);
                case 'pitamStatus':
                    return this.compareValues(left.pitamStatus, right.pitamStatus, factor);
                case 'updatedAt':
                    return this.compareValues(left.lastUpdatedAt?.getTime() ?? 0, right.lastUpdatedAt?.getTime() ?? 0, factor);
                case 'category':
                default:
                    return this.compareValues(left.traderCategoryName ?? '', right.traderCategoryName ?? '', factor);
            }
        });
    }

    private compareValues(left: string | number, right: string | number, factor: number) {
        if (left < right) {
            return -1 * factor;
        }

        if (left > right) {
            return 1 * factor;
        }

        return 0;
    }
}