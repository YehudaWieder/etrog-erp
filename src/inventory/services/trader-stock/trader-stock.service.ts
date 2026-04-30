// src/inventory/services/trader-stock/trader-stock.service.ts

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, MovementType } from 'src/generated/prisma';
import { SeasonsService } from 'src/seasons/seasons.service';

@Injectable()
export class TraderStockService {
    constructor(
        private prisma: PrismaService,
        private seasonsService: SeasonsService,
    ) {}

    // Create a new stock movement
    async createMovement(data: Prisma.TraderStockUncheckedCreateInput) {
                const { id: seasonId } = await this.seasonsService.findActiveSeason();

        return this.prisma.traderStock.create({
        data: {
            ...data,
            seasonId,
        },
        });
    }

    // Get all movements for a specific trader and category in a season
    async getMovementHistory(seasonId: number, traderId: number, traderCategoryId: number) {
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

    async createAdjustment(data: Prisma.TraderStockUncheckedCreateInput) {
        this.validateAdjustmentType(data.type);
        const { id: seasonId } = await this.seasonsService.findActiveSeason();
        const movementType = data.type as MovementType;
        const quantity = this.requireQuantity(data.quantity);

        return this.prisma.$transaction(async (tx) => {
            return tx.traderStock.create({
                data: {
                    ...data,
                    seasonId,
                    quantity: this.normalizeAdjustmentQuantity(movementType, quantity),
                    shipmentId: null,
                    boxId: null,
                },
            });
        });
    }

    async updateAdjustment(id: number, data: Prisma.TraderStockUncheckedUpdateInput) {
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

            const nextType = (data.type ?? existing.type) as MovementType;
            this.validateAdjustmentType(nextType);

            return tx.traderStock.update({
                where: { id },
                data: {
                    ...data,
                    shipmentId: null,
                    boxId: null,
                    quantity:
                        data.quantity === undefined
                            ? undefined
                            : this.normalizeAdjustmentQuantity(nextType, Number(data.quantity)),
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
}