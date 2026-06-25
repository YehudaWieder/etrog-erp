import { Injectable } from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AllocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  deleteCustomerAllocationsByReferenceIds(
    ids: number[],
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.customerAllocation.deleteMany({
      where: {
        MovementReferenceId: { in: ids },
        type: MovementType.HARVEST_IN,
        shipmentId: null,
        boxId: null,
      },
    });
  }

  deleteTraderStocksByReferenceIds(ids: number[], tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.traderStock.deleteMany({
      where: {
        MovementReferenceId: { in: ids },
        type: { in: [MovementType.HARVEST_IN, MovementType.ASSIGNED] },
        shipmentId: null,
        boxId: null,
      },
    });
  }
}
