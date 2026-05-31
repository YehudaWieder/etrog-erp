import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CombinedSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  groupTraderSummary(where: Prisma.TraderStockWhereInput) {
    return this.prisma.traderStock.groupBy({
      by: ['traderId', 'isModulo', 'traderCategoryId', 'grade', 'pitamStatus'],
      where,
      _sum: { quantity: true },
      _max: { updatedAt: true },
    });
  }

  groupCustomerSummary(where: Prisma.CustomerAllocationWhereInput) {
    return this.prisma.customerAllocation.groupBy({
      by: ['customerId', 'customerCategoryId', 'pitamStatus'],
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

  findTraderCategoriesByIds(categoryIds: number[]) {
    if (!categoryIds.length) {
      return Promise.resolve([] as { id: number; name: string }[]);
    }

    return this.prisma.tradersCategories.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
  }

  findCustomersByIds(customerIds: number[]) {
    if (!customerIds.length) {
      return Promise.resolve([] as { id: number; customerName: string }[]);
    }

    return this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, customerName: true },
    });
  }

  findCustomerCategoriesByIds(categoryIds: number[]) {
    if (!categoryIds.length) {
      return Promise.resolve([] as { id: number; name: string; grade: string | null }[]);
    }

    return this.prisma.customerCategories.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, grade: true },
    });
  }
}
