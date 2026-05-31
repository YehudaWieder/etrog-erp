// src/inventory/services/trader-stock/trader-stock.service.ts

import { BadRequestException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, MovementType, Grade, PitamStatus } from 'src/generated/prisma';
import { SeasonsService } from 'src/seasons/seasons.service';
import { InventoryAvailabilityService } from '../inventory-availability.service';
import { InventorySummaryQuery } from './dto/inventory-summary.dto';
import { TraderStockSummaryService } from './trader-stock-summary.service';
import {
    normalizeAdjustmentQuantity,
    requireAdjustmentQuantity,
    validateAdjustmentType,
} from 'src/inventory/services/inventory-core/utils/adjustment-movement.util';

@Injectable()
export class TraderStockService {
    constructor(
        private prisma: PrismaService,
        private seasonsService: SeasonsService,
        private inventoryAvailabilityService: InventoryAvailabilityService,
        private traderStockSummaryService: TraderStockSummaryService,
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

    async createAdjustment(data: Prisma.TraderStockUncheckedCreateInput, actorId: number) {
        const createPayload: Prisma.TraderStockUncheckedCreateInput = {
            ...data,
            updatedById: actorId,
        };

        validateAdjustmentType(createPayload.type);
        const { id: seasonId } = await this.seasonsService.findActiveSeason();
        const movementType = createPayload.type as MovementType;
        const quantity = requireAdjustmentQuantity(createPayload.quantity);
        const normalizedQuantity = normalizeAdjustmentQuantity(movementType, quantity);

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
        try {
            return await this.prisma.traderStock.delete({
            where: { id },
            });
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

}