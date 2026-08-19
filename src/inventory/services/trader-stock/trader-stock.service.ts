// src/inventory/services/trader-stock/trader-stock.service.ts

import { BadRequestException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, MovementType, Grade, PitamStatus } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';
import { InventoryAvailabilityService } from '../inventory-availability.service';
import { InventorySummaryQuery } from './dto/inventory-summary.dto';
import { TraderStockSummaryService } from './trader-stock-summary.service';
import {
    normalizeAdjustmentQuantity,
    requireAdjustmentQuantity,
    validateAdjustmentType,
} from 'src/inventory/services/inventory-core/utils/adjustment-movement.util';
import { GeneralShareAllocationService } from '../general-share-allocation/general-share-allocation.service';
import { AuditLogService } from 'src/audit/audit.service';

@Injectable()
export class TraderStockService {
    constructor(
        private prisma: PrismaService,
        private seasonsService: SeasonsService,
        private inventoryAvailabilityService: InventoryAvailabilityService,
        private traderStockSummaryService: TraderStockSummaryService,
        private generalShareAllocationService: GeneralShareAllocationService,
        private auditLog: AuditLogService,
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

        const created = await this.prisma.traderStock.create({
            data: {
                ...createPayload,
                seasonId,
            },
        });

        await this.auditLog.record({
            userId: actorId,
            action: 'CREATE',
            entityType: 'TraderStock',
            entityId: created.id,
            after: created,
        });

        return created;
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
        grade: Grade;
        pitamStatus: PitamStatus;
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
        return this.traderStockSummaryService.getSummary(query);
    }

    async createAdjustment(data: Prisma.TraderStockUncheckedCreateInput & { stockSource?: 'GENERAL' | 'PRIVATE_SELECTION' }, actorId: number) {
        const { stockSource: requestedStockSource, ...rest } = data as typeof data & { stockSource?: 'GENERAL' | 'PRIVATE_SELECTION' };

        validateAdjustmentType(rest.type);
        const { id: seasonId } = await this.seasonsService.findActiveSeason();
        const movementType = rest.type as MovementType;
        const quantity = requireAdjustmentQuantity(rest.quantity);
        const normalizedQuantity = normalizeAdjustmentQuantity(movementType, quantity);
        const isModulo = Boolean(rest.isModulo);

        // WASTE with no specific trader ("כללי") draws from the combined MODULO + all-traders
        // pool by category share — a different shape (possibly several ledger rows) than the
        // single-row path below, so it's handled entirely separately.
        if (movementType === MovementType.WASTE && isModulo) {
            return this.createGeneralWaste(rest, seasonId, normalizedQuantity, actorId);
        }

        // WASTE against a specific trader always targets that trader's private-selection pool —
        // never their share of the general pool — regardless of what the client sends.
        const stockSource = movementType === MovementType.WASTE && !isModulo ? 'PRIVATE_SELECTION' : requestedStockSource;
        const isFromPrivateSelection = stockSource === 'PRIVATE_SELECTION';

        const createPayload: Prisma.TraderStockUncheckedCreateInput = {
            ...rest,
            updatedById: actorId,
            isFromPrivateSelection,
        };

        const created = await this.prisma.$transaction(async (tx) => {
            await this.assertNegativeTraderMovementHasStock(tx, {
                ...createPayload,
                seasonId,
                quantity: normalizedQuantity,
            }, 0, stockSource);

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

        await this.auditLog.record({
            userId: actorId,
            action: 'CREATE',
            entityType: 'TraderStock',
            entityId: created.id,
            after: created,
        });

        return created;
    }

    // "כללי" WASTE: drain MODULO first, then split any deficit across traders by their
    // TraderCategoryShare percent, excluding each trader's private-selection stock. A rounding
    // overage from the fair-share step is returned to MODULO. All rows from a multi-row split
    // share a MovementReferenceId (self-linked to the first row) so they can be deleted together
    // as one batch. Delegates the actual deduction math to GeneralShareAllocationService, which
    // also backs ReclassificationService's "from GENERAL" deduction.
    private async createGeneralWaste(
        data: Prisma.TraderStockUncheckedCreateInput,
        seasonId: number,
        normalizedQuantity: number,
        actorId: number,
    ) {
        const traderCategoryId = Number(data.traderCategoryId);
        const grade = data.grade as Grade;
        const pitamStatus = data.pitamStatus as PitamStatus;
        const requestQuantity = Math.abs(normalizedQuantity);
        const date = data.date as Date;
        const notes = data.notes as string | null | undefined;

        if (!traderCategoryId || !grade || !pitamStatus) {
            throw new BadRequestException('Negative trader movement requires traderCategoryId, grade, and pitamStatus');
        }

        const result = await this.prisma.$transaction(async (tx) => {
            const { rows: createdRows } = await this.generalShareAllocationService.deductGeneralQuantity(tx, {
                seasonId,
                date,
                traderCategoryId,
                grade,
                pitamStatus,
                quantity: requestQuantity,
                type: MovementType.WASTE,
                contextLabel: 'General waste',
                excludePrivateSelection: true,
                updatedById: actorId,
                notes,
            });

            if (createdRows.length > 1) {
                const referenceId = createdRows[0].id;
                await tx.traderStock.updateMany({
                    where: { id: { in: createdRows.map((row) => row.id) } },
                    data: { MovementReferenceId: referenceId },
                });
            }

            return createdRows.length === 1
                ? tx.traderStock.findUniqueOrThrow({ where: { id: createdRows[0].id } })
                : { batchId: createdRows[0].id, movements: createdRows };
        });

        await this.auditLog.record({
            userId: actorId,
            action: 'CREATE',
            entityType: 'TraderStock',
            entityId: 'batchId' in result ? result.batchId : result.id,
            after: result,
        });

        return result;
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

            if (existing.type === MovementType.WASTE && existing.MovementReferenceId !== null) {
                throw new BadRequestException(
                    'A general waste movement split across multiple traders cannot be edited — delete and re-enter it instead.',
                );
            }

            const nextType = (updatePayload.type ?? existing.type) as MovementType;
            validateAdjustmentType(nextType);

            const nextQuantityRaw =
                updatePayload.quantity === undefined ? existing.quantity : Number(updatePayload.quantity);
            const nextQuantity =
                updatePayload.quantity === undefined
                    ? existing.quantity
                    : normalizeAdjustmentQuantity(nextType, nextQuantityRaw);

            await this.assertNegativeTraderMovementHasStock(tx, {
                seasonId: existing.seasonId,
                traderId: (updatePayload.traderId ?? existing.traderId) as number | null,
                traderCategoryId: Number(updatePayload.traderCategoryId ?? existing.traderCategoryId),
                grade: (updatePayload.grade ?? existing.grade) as Grade,
                pitamStatus: (updatePayload.pitamStatus ?? existing.pitamStatus) as PitamStatus,
                isModulo: Boolean(updatePayload.isModulo ?? existing.isModulo),
                quantity: nextQuantity,
            }, Math.abs(existing.quantity));

            const updated = await tx.traderStock.update({
                where: { id },
                data: {
                    ...updatePayload,
                    shipmentId: null,
                    boxId: null,
                    quantity: updatePayload.quantity === undefined ? undefined : nextQuantity,
                },
            });

            return { existing, updated };
        }).then(async ({ existing, updated }) => {
            await this.auditLog.record({
                userId: actorId,
                action: 'UPDATE',
                entityType: 'TraderStock',
                entityId: id,
                before: existing,
                after: updated,
            });

            return updated;
        });
    }

    async removeAdjustment(id: number, actorId: number) {
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

            if (existing.type === MovementType.WASTE && existing.MovementReferenceId !== null) {
                return this.removeGeneralWasteBatch(tx, existing.MovementReferenceId, actorId);
            }

            const removed = await tx.traderStock.update({
                where: { id },
                data: { isDeleted: true },
            });

            await this.auditLog.record({
                userId: actorId,
                action: 'DELETE',
                entityType: 'TraderStock',
                entityId: id,
                before: existing,
            });

            return removed;
        });
    }

    // Undoes a multi-row "כללי" WASTE split (see createGeneralWaste) — every row sharing the
    // batch's MovementReferenceId is soft-deleted together, mirroring PitamSplitService.deleteBatchInTx.
    private async removeGeneralWasteBatch(tx: Prisma.TransactionClient, referenceId: number, actorId: number) {
        const rows = await tx.traderStock.findMany({
            where: { MovementReferenceId: referenceId, type: { in: [MovementType.WASTE, MovementType.ASSIGNED] }, isDeleted: false },
        });

        if (rows.length === 0) {
            throw new NotFoundException(`Trader adjustment batch ${referenceId} not found`);
        }

        const { seasonId } = rows[0];

        // Undoing removes the positive "overage returned to modulo" row this batch may have
        // created — assert that quantity hasn't since been consumed downstream, or the ledger
        // would be left short.
        const positiveRows = rows.filter((row) => row.quantity > 0);
        for (const row of positiveRows) {
            await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(tx, {
                seasonId,
                traderId: row.traderId,
                traderCategoryId: row.traderCategoryId,
                grade: row.grade,
                pitamStatus: row.pitamStatus,
                isModulo: row.isModulo,
                requiredQuantity: row.quantity,
                contextLabel: 'Undo general waste split',
            });
        }

        await tx.traderStock.updateMany({
            where: { id: { in: rows.map((row) => row.id) } },
            data: { isDeleted: true },
        });

        await this.auditLog.record({
            userId: actorId,
            action: 'DELETE',
            entityType: 'TraderStock',
            entityId: referenceId,
            before: rows,
        });

        return { batchId: referenceId, deletedCount: rows.length };
    }

    // Hard delete a movement
    async remove(id: number, actorId: number) {
        try {
            const existing = await this.prisma.traderStock.findUniqueOrThrow({ where: { id } });
            const removed = await this.prisma.traderStock.delete({
                where: { id },
            });

            await this.auditLog.record({
                userId: actorId,
                action: 'DELETE',
                entityType: 'TraderStock',
                entityId: id,
                before: existing,
            });

            return removed;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
                throw new ConflictException('Cannot delete trader stock movement because related records exist in the system.');
            }

            throw error;
        }
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
        stockSource?: 'GENERAL' | 'PRIVATE_SELECTION',
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
            onlyPrivateSelection: stockSource === 'PRIVATE_SELECTION',
            excludePrivateSelection: !isModulo && stockSource === 'GENERAL',
        });
    }

}