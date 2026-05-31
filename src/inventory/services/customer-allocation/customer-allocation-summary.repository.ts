import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CustomerAllocationSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  groupSummary(where: Prisma.CustomerAllocationWhereInput) {
    return this.prisma.customerAllocation.groupBy({
      by: ['customerId', 'customerCategoryId', 'pitamStatus'],
      where,
      _sum: { quantity: true },
      _max: { updatedAt: true },
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

  findCategoriesByIds(categoryIds: number[]) {
    if (!categoryIds.length) {
      return Promise.resolve([] as { id: number; name: string; grade: string | null }[]);
    }

    return this.prisma.customerCategories.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, grade: true },
    });
  }
}
