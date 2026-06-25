import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ClassificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private client(tx?: Prisma.TransactionClient): PrismaClient | Prisma.TransactionClient {
    return tx ?? this.prisma;
  }

  findByHarvest(fieldHarvestId: number) {
    return this.prisma.classification.findMany({
      where: { fieldHarvestId, isDeleted: false },
      include: {
        trader: { select: { name: true } },
        customer: { select: { customerName: true } },
        traderCategory: { select: { name: true } },
        customerCategory: { select: { name: true, grade: true } },
        updatedBy: { select: { name: true } },
      },
    });
  }

  findAllBySeason(seasonId: number) {
    return this.prisma.classification.findMany({
      where: { seasonId, isDeleted: false },
      select: {
        id: true,
        assignmentType: true,
        grade: true,
        pitamStatus: true,
        quantity: true,
        notes: true,
        trader: { select: { name: true } },
        customer: { select: { customerName: true } },
        traderCategory: { select: { name: true } },
        customerCategory: { select: { name: true, grade: true } },
        updatedBy: { select: { name: true } },
        fieldHarvest: {
          select: {
            id: true,
            fieldId: true,
            dateGregorian: true,
            dateHebrew: true,
            isPartialClassification: true,
            field: { select: { name: true } },
          },
        },
      },
      orderBy: [
        { fieldHarvest: { dateGregorian: 'desc' } },
        { fieldHarvest: { id: 'desc' } },
        { id: 'asc' },
      ],
    });
  }

  findDailySummarySourceRows(seasonId: number) {
    return this.prisma.classification.findMany({
      where: {
        seasonId,
        isDeleted: false,
        fieldHarvest: {
          isDeleted: false,
        },
      },
      select: {
        quantity: true,
        assignmentType: true,
        traderId: true,
        customerId: true,
        traderCategoryId: true,
        customerCategoryId: true,
        trader: { select: { name: true } },
        customer: { select: { customerName: true } },
        traderCategory: { select: { name: true } },
        customerCategory: { select: { name: true } },
        fieldHarvest: {
          select: {
            id: true,
            fieldId: true,
            dateGregorian: true,
            dateHebrew: true,
            field: { select: { name: true } },
          },
        },
      },
      orderBy: [
        { fieldHarvest: { dateGregorian: 'desc' } },
        { fieldHarvest: { id: 'desc' } },
      ],
    });
  }

  findOne(id: number) {
    return this.prisma.classification.findFirst({ where: { id, isDeleted: false } });
  }

  findUnique(id: number, tx?: Prisma.TransactionClient) {
    return this.client(tx).classification.findFirst({ where: { id, isDeleted: false } });
  }

  findIdsByHarvest(harvestId: number, tx?: Prisma.TransactionClient) {
    return this.client(tx).classification.findMany({
      where: { fieldHarvestId: harvestId, isDeleted: false },
      select: { id: true },
    });
  }

  findDeletedBySeason(seasonId: number) {
    return this.prisma.classification.findMany({
      where: { seasonId, isDeleted: true },
      select: {
        id: true,
        assignmentType: true,
        traderId: true,
        customerId: true,
        traderCategoryId: true,
        customerCategoryId: true,
        grade: true,
        pitamStatus: true,
        quantity: true,
        notes: true,
        trader: { select: { name: true } },
        customer: { select: { customerName: true } },
        traderCategory: { select: { name: true } },
        customerCategory: { select: { name: true, grade: true } },
        updatedBy: { select: { name: true } },
        fieldHarvest: {
          select: {
            id: true,
            fieldId: true,
            dateGregorian: true,
            dateHebrew: true,
            isPartialClassification: true,
            field: { select: { name: true } },
          },
        },
      },
      orderBy: [
        { fieldHarvest: { dateGregorian: 'desc' } },
        { fieldHarvest: { id: 'desc' } },
        { id: 'asc' },
      ],
    });
  }

  permanentDeleteById(id: number, tx?: Prisma.TransactionClient) {
    return this.client(tx).classification.delete({ where: { id } });
  }

  findAllIdsByHarvest(harvestId: number, tx?: Prisma.TransactionClient) {
    return this.client(tx).classification.findMany({
      where: { fieldHarvestId: harvestId },
      select: { id: true },
    });
  }

  aggregateTotalByHarvest(harvestId: number, tx?: Prisma.TransactionClient) {
    return this.client(tx).classification.aggregate({
      _sum: { quantity: true },
      where: { fieldHarvestId: harvestId, isDeleted: false },
    });
  }

  deleteManyByIds(ids: number[], tx?: Prisma.TransactionClient) {
    return this.client(tx).classification.deleteMany({ where: { id: { in: ids } } });
  }
}
