import { Injectable } from '@nestjs/common';
import { PitamStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { InventoryMovementScope } from 'src/inventory/services/inventory-core/types/inventory-query.types';

@Injectable()
export class CustomerAllocationSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  groupSummary(where: Prisma.CustomerAllocationWhereInput, shipmentScope?: InventoryMovementScope) {
    if (shipmentScope === 'SHIPPED') {
      return this.groupSummaryWithBoxStatus(where);
    }

    return this.prisma.customerAllocation.groupBy({
      by: ['customerId', 'customerCategoryId', 'pitamStatus'],
      where,
      _sum: { quantity: true },
      _max: { updatedAt: true },
    });
  }

  private async groupSummaryWithBoxStatus(where: Prisma.CustomerAllocationWhereInput) {
    const allocations = await this.prisma.customerAllocation.findMany({
      where,
      select: {
        customerId: true,
        customerCategoryId: true,
        pitamStatus: true,
        quantity: true,
        updatedAt: true,
        boxId: true,
      },
    });

    const boxIds = [...new Set(allocations.map((a) => a.boxId).filter((id): id is number => id !== null))];

    const shippedBoxIds = boxIds.length
      ? await this.prisma.box
          .findMany({
            where: { id: { in: boxIds }, status: { in: ['SHIPPED', 'DELIVERED'] } },
            select: { id: true },
          })
          .then((boxes) => new Set(boxes.map((b) => b.id)))
      : new Set<number>();

    const filtered = allocations.filter((a) => a.boxId !== null && shippedBoxIds.has(a.boxId));

    const grouped = new Map<
      string,
      {
        customerId: number;
        customerCategoryId: number;
        pitamStatus: PitamStatus;
        totalQuantity: number;
        maxUpdatedAt: Date | null;
      }
    >();

    for (const a of filtered) {
      const key = `${a.customerId}|${a.customerCategoryId}|${a.pitamStatus}`;
      const existing = grouped.get(key);

      if (existing) {
        existing.totalQuantity += a.quantity;
        if (a.updatedAt && (!existing.maxUpdatedAt || a.updatedAt > existing.maxUpdatedAt)) {
          existing.maxUpdatedAt = a.updatedAt;
        }
      } else {
        grouped.set(key, {
          customerId: a.customerId,
          customerCategoryId: a.customerCategoryId,
          pitamStatus: a.pitamStatus,
          totalQuantity: a.quantity,
          maxUpdatedAt: a.updatedAt,
        });
      }
    }

    return Array.from(grouped.values()).map((g) => ({
      customerId: g.customerId,
      customerCategoryId: g.customerCategoryId,
      pitamStatus: g.pitamStatus,
      _sum: { quantity: g.totalQuantity },
      _max: { updatedAt: g.maxUpdatedAt },
    }));
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
