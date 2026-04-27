// src/inventory/services/trader-stock/trader-stock.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, MovementType } from '@prisma/client';
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

    // Soft delete a movement
    async remove(id: number) {
        return this.prisma.traderStock.update({
        where: { id },
        data: { isDeleted: true },
        });
    }
}