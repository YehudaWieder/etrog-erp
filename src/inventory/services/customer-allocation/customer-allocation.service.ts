// src/inventory/services/customer-allocation/customer-allocation.service.ts

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, MovementType } from 'src/generated/prisma';
import { SeasonsService } from 'src/seasons/seasons.service';

@Injectable()
export class CustomerAllocationService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

  // Create a new allocation record
  async create(data: Prisma.CustomerAllocationUncheckedCreateInput) {
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    return this.prisma.customerAllocation.create({
      data: {
        ...data,
        seasonId,
      },
    });
  }

  // Get the total allocated quantity for a customer in a season, optionally filtered by category and pitam status
  async getBalance(query: {
    seasonId: number;
    customerId: number;
    customerCategoryId: number;
    pitamStatus: any;
  }) {
    const aggregation = await this.prisma.customerAllocation.aggregate({
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

  // Find all allocations for a specific customer in a season
  async findAllByCustomer(customerId: number, seasonId: number) {
    return this.prisma.customerAllocation.findMany({
      where: { customerId, seasonId, isDeleted: false },
      include: {
        customerCategory: { select: { name: true, grade: true } },
        traderSourceName: { select: { name: true } }, // The trader who provided the goods
        updatedBy: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

   // Get full ledger for transparency
  async getLedger(seasonId: number, customerId: number) {
    return this.prisma.customerAllocation.findMany({
    where: { seasonId, customerId, isDeleted: false },
    include: {
        customerCategory: { select: { name: true, grade: true } },
        traderSourceName: { select: { name: true } },
        updatedBy: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
    });
  }

  // Find by reference (e.g., linked to a specific classification or trader stock)
  async findByReference(referenceId: number) {
    return this.prisma.customerAllocation.findMany({
      where: { MovementReferenceId: referenceId, isDeleted: false },
    });
  }

  async update(id: number, data: Prisma.CustomerAllocationUncheckedUpdateInput) {
    return this.prisma.customerAllocation.update({
      where: { id },
      data,
    });
  }

  async createAdjustment(data: Prisma.CustomerAllocationUncheckedCreateInput) {
    this.validateAdjustmentType(data.type);
    const { id: seasonId } = await this.seasonsService.findActiveSeason();
    const movementType = data.type as MovementType;
    const quantity = this.requireQuantity(data.quantity);

    return this.prisma.$transaction(async (tx) => {
      return tx.customerAllocation.create({
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

  async updateAdjustment(id: number, data: Prisma.CustomerAllocationUncheckedUpdateInput) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.customerAllocation.findFirst({
        where: {
          id,
          isDeleted: false,
          type: { in: [MovementType.WASTE, MovementType.ADJUSTMENT] },
        },
      });

      if (!existing) {
        throw new NotFoundException(`Customer adjustment ${id} not found`);
      }

      const nextType = (data.type ?? existing.type) as MovementType;
      this.validateAdjustmentType(nextType);

      return tx.customerAllocation.update({
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
      const existing = await tx.customerAllocation.findFirst({
        where: {
          id,
          isDeleted: false,
          type: { in: [MovementType.WASTE, MovementType.ADJUSTMENT] },
        },
      });

      if (!existing) {
        throw new NotFoundException(`Customer adjustment ${id} not found`);
      }

      return tx.customerAllocation.update({
        where: { id },
        data: { isDeleted: true },
      });
    });
  }

  // Hard delete
  async remove(id: number) {
    return this.prisma.customerAllocation.delete({
      where: { id },
    });
  }

  private validateAdjustmentType(type?: MovementType | null) {
    if (!type) {
      throw new BadRequestException('type is required for adjustment movement');
    }

    if (type !== MovementType.WASTE && type !== MovementType.ADJUSTMENT) {
      throw new BadRequestException('type must be WASTE or ADJUSTMENT');
    }
  }

  private normalizeAdjustmentQuantity(type: MovementType, quantity: number) {
    if (!Number.isFinite(quantity) || quantity === 0) {
      throw new BadRequestException('quantity must be a non-zero number');
    }

    if (type === MovementType.WASTE) {
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