// src/harvest/harvest-bulk.service.ts

import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, AssignmentType } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';
import { HarvestBulkCreateDto, ClassificationBulkItemDto } from 'src/docs/dto/swagger-enums.dto';

@Injectable()
export class HarvestBulkService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

  /**
   * Bulk create: FieldHarvest + Classifications + CustomerAllocations/TraderStocks
   * All in a single transaction.
   */
  async createHarvestWithClassifications(bulkDto: HarvestBulkCreateDto) {
    // 1. Validate no duplicate classifications
    this.validateNoDuplicateClassifications(bulkDto.classifications);

    // 2. Get active season
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    // 3. Execute entire flow in transaction
    return this.prisma.$transaction(async (tx) => {
      // 3a. Create FieldHarvest
      const dateStr = new Date(bulkDto.dateGregorian).toISOString().split('T')[0];
      const slug = `${dateStr}-f${bulkDto.fieldId}-s${seasonId}`;

      const existingHarvest = await tx.fieldHarvest.findUnique({ where: { slug } });
      if (existingHarvest) {
        throw new ConflictException('A report for this field and date already exists');
      }

      const rates = this.calculateRates(bulkDto);

      const harvest = await tx.fieldHarvest.create({
        data: {
          seasonId,
          dateGregorian: new Date(bulkDto.dateGregorian),
          dateHebrew: bulkDto.dateHebrew,
          fieldId: bulkDto.fieldId,
          updatedById: bulkDto.updatedById,
          totalHarvested: bulkDto.totalHarvested || 0,
          totalRejected: bulkDto.totalRejected || 0,
          ownerHarvested: bulkDto.ownerHarvested || 0,
          ownerRejected: bulkDto.ownerRejected || 0,
          slug,
          ...rates,
        },
      });

      // 3b. Process each classification
      const classifications: any[] = [];
      for (const classItem of bulkDto.classifications) {
        // Create Classification
        const classSlug = `harvest-${harvest.id}-tcat-${classItem.traderCategoryId ?? 0}-ccat-${classItem.customerCategoryId ?? 0}-g-${classItem.grade ?? 'NA'}-pitam-${classItem.pitamStatus}-a-${classItem.assignmentType}`;

        const classification = await tx.classification.create({
          data: {
            seasonId,
            fieldHarvestId: harvest.id,
            updatedById: bulkDto.updatedById,
            assignmentType: classItem.assignmentType,
            traderId: classItem.traderId,
            customerId: classItem.customerId,
            traderCategoryId: classItem.traderCategoryId,
            customerCategoryId: classItem.customerCategoryId,
            grade: classItem.grade || undefined,
            pitamStatus: classItem.pitamStatus,
            quantity: classItem.quantity,
            notes: classItem.notes,
            slug: classSlug,
          } as any,
        });

        classifications.push(classification);

        // Handle allocation based on assignmentType
        if (classItem.assignmentType === AssignmentType.CUSTOMER) {
          // Create CustomerAllocation
          await tx.customerAllocation.create({
            data: {
              seasonId,
              date: new Date(bulkDto.dateGregorian),
              dateHebrew: bulkDto.dateHebrew,
              customerId: classItem.customerId!,
              customerCategoryId: classItem.customerCategoryId!,
              pitamStatus: classItem.pitamStatus,
              quantity: classItem.quantity,
              type: 'HARVEST_IN',
              takenFrom: 'GENERAL',
              MovementReferenceId: classification.id,
              updatedById: bulkDto.updatedById,
              notes: classItem.notes,
            },
          });
        } else if (classItem.assignmentType === AssignmentType.TRADER) {
          if (!classItem.traderCategoryId) {
            throw new BadRequestException('traderCategoryId is required for TRADER classifications');
          }

          if (!classItem.grade) {
            throw new BadRequestException('grade is required for TRADER classifications');
          }

          // Get all traders for this category
          const shares = await tx.traderCategoryShare.findMany({
            where: {
              seasonId,
              traderCategoryId: classItem.traderCategoryId,
            },
            orderBy: { traderId: 'asc' },
            include: { trader: true },
          });

          if (shares.length === 0) {
            throw new BadRequestException(
              `No trader shares found for category ${classItem.traderCategoryId} in season ${seasonId}`,
            );
          }

          // Pre-calculate allocations; if any trader would get 0, push everything to modulo.
          const allocations = shares.map((share) => ({
            share,
            quantity: Math.floor((classItem.quantity * Number(share.percent)) / 100),
          }));

          const canDistributeToAll = allocations.every((allocation) => allocation.quantity > 0);
          let didAddModulo = false;

          if (!canDistributeToAll) {
            await tx.traderStock.create({
              data: {
                seasonId,
                date: new Date(bulkDto.dateGregorian),
                traderId: null, // Modulo pool
                traderCategoryId: classItem.traderCategoryId,
                grade: classItem.grade,
                pitamStatus: classItem.pitamStatus,
                quantity: classItem.quantity,
                isModulo: true,
                type: 'HARVEST_IN',
                MovementReferenceId: classification.id,
                updatedById: bulkDto.updatedById,
                notes: classItem.notes,
              },
            });
            didAddModulo = true;
          } else {
            let totalAllocated = 0;

            for (const allocation of allocations) {
              await tx.traderStock.create({
                data: {
                  seasonId,
                  date: new Date(bulkDto.dateGregorian),
                  traderId: allocation.share.traderId,
                  traderCategoryId: classItem.traderCategoryId,
                  grade: classItem.grade,
                  pitamStatus: classItem.pitamStatus,
                  quantity: allocation.quantity,
                  isModulo: false,
                  type: 'HARVEST_IN',
                  MovementReferenceId: classification.id,
                  updatedById: bulkDto.updatedById,
                  notes: classItem.notes,
                },
              });

              totalAllocated += allocation.quantity;
            }

            // Handle remainder (modulo)
            const remainder = classItem.quantity - totalAllocated;
            if (remainder > 0) {
              await tx.traderStock.create({
                data: {
                  seasonId,
                  date: new Date(bulkDto.dateGregorian),
                  traderId: null, // Modulo pool
                  traderCategoryId: classItem.traderCategoryId,
                  grade: classItem.grade,
                  pitamStatus: classItem.pitamStatus,
                  quantity: remainder,
                  isModulo: true,
                  type: 'HARVEST_IN',
                  MovementReferenceId: classification.id,
                  updatedById: bulkDto.updatedById,
                  notes: classItem.notes,
                },
              });
              didAddModulo = true;
            }
          }

          if (didAddModulo) {
            await this.tryAssignFromModuloPool(tx, {
              seasonId,
              date: new Date(bulkDto.dateGregorian),
              traderCategoryId: classItem.traderCategoryId,
              grade: classItem.grade,
              pitamStatus: classItem.pitamStatus,
              updatedById: bulkDto.updatedById,
              notes: classItem.notes,
              movementReferenceId: classification.id,
            });
          }
        }
      }

      return {
        harvest,
        classifications,
      };
    });
  }

  private validateNoDuplicateClassifications(items: ClassificationBulkItemDto[]) {
    const seen = new Set<string>();

    for (const item of items) {
      const key = `${item.assignmentType}|${item.traderId ?? 'null'}|${item.customerId ?? 'null'}|${item.traderCategoryId ?? 'null'}|${item.customerCategoryId ?? 'null'}|${item.grade ?? 'null'}`;
      if (seen.has(key)) {
        throw new ConflictException(
          'Duplicate classification found. Each combination of assignmentType, trader/customer, and category must be unique.',
        );
      }
      seen.add(key);
    }
  }

  private calculateRates(data: any) {
    const totalHarvested = data.totalHarvested || 0;
    const totalRejected = data.totalRejected || 0;
    const ownerHarvested = data.ownerHarvested || 0;
    const ownerRejected = data.ownerRejected || 0;

    return {
      rejectionRate: totalHarvested > 0 ? (totalRejected / totalHarvested) * 100 : 0,
      ownerRejectionRate: ownerHarvested > 0 ? (ownerRejected / ownerHarvested) * 100 : 0,
    };
  }

  private async tryAssignFromModuloPool(
    tx: any,
    params: {
      seasonId: number;
      date: Date;
      traderCategoryId: number;
      grade: NonNullable<ClassificationBulkItemDto['grade']>;
      pitamStatus: ClassificationBulkItemDto['pitamStatus'];
      updatedById: number;
      notes?: string;
      movementReferenceId?: number;
    },
  ) {
    const moduloBalance = await tx.traderStock.aggregate({
      _sum: { quantity: true },
      where: {
        seasonId: params.seasonId,
        traderId: null,
        isModulo: true,
        traderCategoryId: params.traderCategoryId,
        grade: params.grade,
        pitamStatus: params.pitamStatus,
        isDeleted: false,
      },
    });

    const availableQty = moduloBalance._sum.quantity ?? 0;
    if (availableQty <= 0) {
      return;
    }

    const shares = await tx.traderCategoryShare.findMany({
      where: {
        seasonId: params.seasonId,
        traderCategoryId: params.traderCategoryId,
      },
      orderBy: { traderId: 'asc' },
    });

    if (shares.length === 0) {
      return;
    }

    const allocations = shares.map((share) => ({
      traderId: share.traderId,
      quantity: Math.floor((availableQty * Number(share.percent)) / 100),
    }));

    const canAssignToAll = allocations.every((allocation) => allocation.quantity > 0);
    if (!canAssignToAll) {
      return;
    }

    let totalAssigned = 0;
    for (const allocation of allocations) {
      await tx.traderStock.create({
        data: {
          seasonId: params.seasonId,
          date: params.date,
          traderId: allocation.traderId,
          traderCategoryId: params.traderCategoryId,
          grade: params.grade,
          pitamStatus: params.pitamStatus,
          quantity: allocation.quantity,
          isModulo: false,
          type: 'ASSIGNED',
          MovementReferenceId: params.movementReferenceId,
          updatedById: params.updatedById,
          notes: params.notes,
        },
      });

      totalAssigned += allocation.quantity;
    }

    if (totalAssigned > 0) {
      await tx.traderStock.create({
        data: {
          seasonId: params.seasonId,
          date: params.date,
          traderId: null,
          traderCategoryId: params.traderCategoryId,
          grade: params.grade,
          pitamStatus: params.pitamStatus,
          quantity: -totalAssigned,
          isModulo: true,
          type: 'ASSIGNED',
          MovementReferenceId: params.movementReferenceId,
          updatedById: params.updatedById,
          notes: params.notes,
        },
      });
    }
  }
}
