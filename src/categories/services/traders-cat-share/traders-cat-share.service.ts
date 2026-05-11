// src/categories/services/traders-cat-share/traders-cat-share.service.ts

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

@Injectable()
export class TraderCatShareService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

  private async validateCategoryTotalPercent(
    seasonId: number,
    traderCategoryId: number,
    newPercent: number,
    excludeTraderId?: number,
  ) {
    const shares = await this.prisma.traderCategoryShare.findMany({
      where: {
        seasonId,
        traderCategoryId,
      },
      select: {
        traderId: true,
        percent: true,
      },
    });

    let total = newPercent;
    for (const share of shares) {
      if (excludeTraderId && share.traderId === excludeTraderId) {
        continue;
      }
      total += Number(share.percent);
    }

    if (total > 100) {
      throw new BadRequestException(
        `Total share percent cannot exceed 100% for category ${traderCategoryId}. Current total would be ${total.toFixed(2)}%.`,
      );
    }
  }

  private extractPercentValue(
    percentInput: Prisma.TraderCategoryShareUpdateInput['percent'],
  ): number | undefined {
    if (percentInput === undefined) {
      return undefined;
    }

    if (
      typeof percentInput === 'object' &&
      percentInput !== null &&
      'set' in percentInput
    ) {
      const value = Number(percentInput.set);
      if (Number.isNaN(value)) {
        throw new BadRequestException('Invalid percent value');
      }
      return value;
    }

    const value = Number(percentInput as number | string);
    if (Number.isNaN(value)) {
      throw new BadRequestException('Invalid percent value');
    }
    return value;
  }

  private isManagerOrAbove(actor: AuthenticatedUser) {
    return actor.role === Role.MANAGER || actor.role === Role.OWNER;
  }

  private toWorkerShareView(record: {
    id: number;
    traderId: number;
    percent: Prisma.Decimal;
    traderCategory: { name: string };
    trader: { name: string };
  }) {
    return {
      id: record.id,
      traderId: record.traderId,
      name: record.traderCategory.name,
      grade: null,
      percent: Number(record.percent),
      notes: null,
      traderName: record.trader.name,
    };
  }

  // Set or Update a share for a trader in a category for a specific season
  async setShare(data: {
    traderId: number;
    traderCategoryId: number;
    percent: number;
  }) {
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    await this.validateCategoryTotalPercent(
      seasonId,
      data.traderCategoryId,
      data.percent,
      data.traderId,
    );

    return this.prisma.traderCategoryShare.upsert({
      where: {
        traderId_traderCategoryId_seasonId: {
          traderId: data.traderId,
          traderCategoryId: data.traderCategoryId,
          seasonId,
        },
      },
      update: { 
        percent: data.percent 
      },
      create: {
        seasonId,
        traderId: data.traderId,
        traderCategoryId: data.traderCategoryId,
        percent: data.percent,
      },
    });
  }

  // Find shares for a specific season with names included
  async findAllBySeason(seasonId: number, actor: AuthenticatedUser) {
    if (this.isManagerOrAbove(actor)) {
      return this.prisma.traderCategoryShare.findMany({
        where: { seasonId },
        include: {
          trader: { select: { name: true } },
          traderCategory: { select: { name: true } },
        },
        orderBy: [
          { traderCategory: { name: 'asc' } },
          { trader: { name: 'asc' } }
        ]
      });
    }

    const records = await this.prisma.traderCategoryShare.findMany({
      where: { seasonId },
      select: {
        id: true,
        traderId: true,
        percent: true,
        trader: { select: { name: true } },
        traderCategory: { select: { name: true } },
      },
      orderBy: [
        { traderCategory: { name: 'asc' } },
        { id: 'asc' }
      ]
    });

    return records.map((record) => this.toWorkerShareView(record));
  }

  // Find a specific share by ID
  async findOne(id: number, actor: AuthenticatedUser) {
    const managerOrAbove = this.isManagerOrAbove(actor);

    const share = managerOrAbove
      ? await this.prisma.traderCategoryShare.findUnique({
          where: { id },
          include: {
            trader: { select: { name: true } },
            traderCategory: { select: { name: true } },
          },
        })
      : await this.prisma.traderCategoryShare.findUnique({
          where: { id },
          select: {
            id: true,
            traderId: true,
            percent: true,
            trader: { select: { name: true } },
            traderCategory: { select: { name: true } },
          },
        });

    if (!share) throw new NotFoundException(`Share record #${id} not found`);
    return managerOrAbove ? share : this.toWorkerShareView(share);
  }

  // Find a share by trader, category, and season
  async findByTraderAndCategory(traderId: number, traderCategoryId: number, seasonId: number, actor: AuthenticatedUser) {
    const managerOrAbove = this.isManagerOrAbove(actor);

    if (managerOrAbove) {
      return this.prisma.traderCategoryShare.findUnique({
        where: {
          traderId_traderCategoryId_seasonId: {
            traderId,
            traderCategoryId,
            seasonId,
          },
        },
      });
    }

    const share = await this.prisma.traderCategoryShare.findUnique({
      where: {
        traderId_traderCategoryId_seasonId: {
          traderId,
          traderCategoryId,
          seasonId,
        },
      },
      select: {
        id: true,
        traderId: true,
        percent: true,
        trader: { select: { name: true } },
        traderCategory: { select: { name: true } },
      },
    });

    if (!share) throw new NotFoundException(`Share record not found for traderId=${traderId}, traderCategoryId=${traderCategoryId}, seasonId=${seasonId}`);
    return this.toWorkerShareView(share);
  }

  // Standard Update
  async update(id: number, data: Prisma.TraderCategoryShareUpdateInput) {
    const currentShare = await this.prisma.traderCategoryShare.findUnique({
      where: { id },
      select: {
        id: true,
        seasonId: true,
        traderId: true,
        traderCategoryId: true,
      },
    });

    if (!currentShare) {
      throw new NotFoundException(`Share record #${id} not found`);
    }

    const nextPercent = this.extractPercentValue(data.percent);
    if (nextPercent !== undefined) {
      await this.validateCategoryTotalPercent(
        currentShare.seasonId,
        currentShare.traderCategoryId,
        nextPercent,
        currentShare.traderId,
      );
    }

    return this.prisma.traderCategoryShare.update({
      where: { id },
      data,
    });
  }

  // Remove a share record
  async remove(id: number) {
    return this.prisma.traderCategoryShare.delete({
      where: { id },
    });
  }
}