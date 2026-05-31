import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TraderStockSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  groupSummary(where: Prisma.TraderStockWhereInput) {
    return this.prisma.traderStock.groupBy({
      by: ['traderId', 'isModulo', 'traderCategoryId', 'grade', 'pitamStatus'],
      where,
      _sum: { quantity: true },
      _max: { updatedAt: true },
    });
  }

  findTradersByIds(traderIds: number[]) {
    if (!traderIds.length) {
      return Promise.resolve([] as { id: number; name: string }[]);
    }

    return this.prisma.trader.findMany({
      where: { id: { in: traderIds } },
      select: { id: true, name: true },
    });
  }

  findCategoriesByIds(categoryIds: number[]) {
    if (!categoryIds.length) {
      return Promise.resolve([] as { id: number; name: string }[]);
    }

    return this.prisma.tradersCategories.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
  }
}
