// src/inventory/services/customer-allocation/customer-allocation.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomerAllocationService {
  constructor(private prisma: PrismaService) {}

  // Create a new allocation record
  async create(data: Prisma.CustomerAllocationUncheckedCreateInput) {
    return this.prisma.customerAllocation.create({
      data,
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

  // Soft delete
  async remove(id: number) {
    return this.prisma.customerAllocation.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}