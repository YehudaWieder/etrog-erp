// src/categories/services/traders-cat-share/traders-cat-share.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';

@Injectable()
export class TraderCatShareService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

  // Set or Update a share for a trader in a category for a specific season
  async setShare(data: {
    seasonId: number;
    traderId: number;
    traderCategoryId: number;
    percent: number;
  }) {
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

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
  async findAllBySeason(seasonId: number) {
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

  // Find a specific share by ID
  async findOne(id: number) {
    const share = await this.prisma.traderCategoryShare.findUnique({
      where: { id },
      include: {
        trader: { select: { name: true } },
        traderCategory: { select: { name: true } },
      },
    });
    if (!share) throw new NotFoundException(`Share record #${id} not found`);
    return share;
  }

  // Find a share by trader, category, and season
  async findByTraderAndCategory(traderId: number, traderCategoryId: number, seasonId: number) {
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

  // Standard Update
  async update(id: number, data: Prisma.TraderCategoryShareUpdateInput) {
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