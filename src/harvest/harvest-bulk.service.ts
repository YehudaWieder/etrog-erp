// src/harvest/harvest-bulk.service.ts

import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, AssignmentType } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';
import { HarvestBulkCreateDto, ClassificationBulkItemDto, UpdateClassificationDto } from 'src/docs/dto/swagger-enums.dto';

@Injectable()
export class HarvestBulkService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

  /**
   * Update a classification and reprocess allocations if needed.
   * If only notes change: simple update. Otherwise: full reprocessing with movement reversal.
   */
  async updateClassification(
    harvestId: number,
    classificationId: number,
    updateDto: UpdateClassificationDto,
  ) {
    // Get the old classification
    const oldClassification = await this.prisma.classification.findUnique({
      where: { id: classificationId },
    });

    if (!oldClassification) {
      throw new NotFoundException(`Classification ${classificationId} not found`);
    }

    if (oldClassification.fieldHarvestId !== harvestId) {
      throw new BadRequestException(
        `Classification ${classificationId} does not belong to harvest ${harvestId}`,
      );
    }

    // Check if only notes are being updated
    const changedFields = Object.keys(updateDto).filter(
      (key) => updateDto[key as keyof UpdateClassificationDto] !== undefined,
    );
    const isOnlyNotesUpdate = changedFields.length === 1 && changedFields[0] === 'notes';

    if (isOnlyNotesUpdate) {
      // Simple notes-only update
      return this.prisma.classification.update({
        where: { id: classificationId },
        data: { notes: updateDto.notes },
      });
    }

    // Full reprocessing with movement reversal
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    return this.prisma.$transaction(async (tx) => {
      // Delete all old movements linked to this classification
      await tx.customerAllocation.deleteMany({
        where: { MovementReferenceId: classificationId },
      });
      await tx.traderStock.deleteMany({
        where: { MovementReferenceId: classificationId },
      });

      // Get the harvest to update quantities
      const harvest = await tx.fieldHarvest.findUnique({
        where: { id: harvestId },
      });

      if (!harvest) {
        throw new NotFoundException(`Harvest ${harvestId} not found`);
      }

      // Update harvest quantities if quantity changed
      const newQuantity = updateDto.quantity ?? oldClassification.quantity;
      const oldQuantity = oldClassification.quantity;
      if (newQuantity !== oldQuantity) {
        const diff = newQuantity - oldQuantity;
        await tx.fieldHarvest.update({
          where: { id: harvestId },
          data: {
            totalHarvested: Math.max(0, harvest.totalHarvested + diff),
          },
        });
      }

      // Update classification with new values
      const updatedClassification = await tx.classification.update({
        where: { id: classificationId },
        data: {
          assignmentType: updateDto.assignmentType ?? oldClassification.assignmentType,
          traderId: updateDto.traderId ?? oldClassification.traderId,
          customerId: updateDto.customerId ?? oldClassification.customerId,
          traderCategoryId: updateDto.traderCategoryId ?? oldClassification.traderCategoryId,
          customerCategoryId: updateDto.customerCategoryId ?? oldClassification.customerCategoryId,
          grade: updateDto.grade ?? oldClassification.grade,
          pitamStatus: updateDto.pitamStatus ?? oldClassification.pitamStatus,
          quantity: newQuantity,
          notes: updateDto.notes ?? oldClassification.notes,
        },
      });

      // Recreate allocations with updated data
      const classificationItem: ClassificationBulkItemDto = {
        assignmentType: updatedClassification.assignmentType,
        traderId: updatedClassification.traderId ?? undefined,
        customerId: updatedClassification.customerId ?? undefined,
        traderCategoryId: updatedClassification.traderCategoryId ?? undefined,
        customerCategoryId: updatedClassification.customerCategoryId ?? undefined,
        grade: updatedClassification.grade ?? undefined,
        pitamStatus: updatedClassification.pitamStatus,
        quantity: updatedClassification.quantity,
        notes: updatedClassification.notes ?? undefined,
      };

      // Process allocations for the updated classification
      await this.processAllocationsForClassification(tx, {
        seasonId,
        classificationId: classificationId,
        classificationItem,
        harvestDate: harvest.dateGregorian,
        updatedById: harvest.updatedById,
      });

      return updatedClassification;
    });
  }

  /**
   * Bulk create: FieldHarvest + Classifications + CustomerAllocations/TraderStocks
   * All in a single transaction.
   */
  async createHarvestWithClassifications(bulkDto: HarvestBulkCreateDto) {
    // 1. Validate no duplicate classifications
    this.validateNoDuplicateClassifications(bulkDto.classifications);
    this.validateClassificationsTotalMatchesHarvested(bulkDto);

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
        const classification = await this.createClassificationAndAllocate(tx, {
          seasonId,
          harvestId: harvest.id,
          classificationItem: classItem,
          harvestDate: new Date(bulkDto.dateGregorian),
          harvestDateHebrew: bulkDto.dateHebrew,
          updatedById: bulkDto.updatedById,
        });

        classifications.push(classification);
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

  private validateClassificationsTotalMatchesHarvested(data: HarvestBulkCreateDto) {
    if (data.totalHarvested === undefined || data.totalHarvested === null) {
      throw new BadRequestException('totalHarvested is required for bulk classifications validation');
    }

    const classificationsTotal = data.classifications.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0,
    );

    if (classificationsTotal !== data.totalHarvested) {
      throw new BadRequestException(
        `Total classifications quantity (${classificationsTotal}) must equal totalHarvested (${data.totalHarvested})`,
      );
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

    const shares = await this.getTraderCategoryShares(tx, params.seasonId, params.traderCategoryId);

    if (shares.length === 0) {
      return;
    }

    const allocations = this.calculateShareAllocations(availableQty, shares).map((allocation) => ({
      traderId: allocation.share.traderId,
      quantity: allocation.quantity,
    }));

    const canAssignToAll = allocations.every((allocation) => allocation.quantity > 0);
    if (!canAssignToAll) {
      return;
    }

    const totalAssigned = allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
    const moduloRemainder = availableQty - totalAssigned;

    if (totalAssigned <= 0) {
      return;
    }

    if (moduloRemainder < 0) {
      throw new BadRequestException(
        `Invalid trader shares configuration for category ${params.traderCategoryId}: total assigned (${totalAssigned}) exceeds available modulo (${availableQty})`,
      );
    }

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
    }

    // Subtract only what was actually assigned; modulo remainder stays as-is.
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

  private async getTraderCategoryShares(tx: any, seasonId: number, traderCategoryId: number) {
    return tx.traderCategoryShare.findMany({
      where: {
        seasonId,
        traderCategoryId,
      },
      orderBy: { traderId: 'asc' },
    });
  }

  private calculateShareAllocations(
    quantity: number,
    shares: Array<{ traderId: number; percent: Prisma.Decimal | number | string }>,
  ) {
    return shares.map((share) => ({
      share,
      quantity: Math.floor((quantity * Number(share.percent)) / 100),
    }));
  }

  private async processAllocationsForClassification(
    tx: any,
    params: {
      seasonId: number;
      classificationId: number;
      classificationItem: ClassificationBulkItemDto;
      harvestDate: Date;
      updatedById: number;
    },
  ) {
    const classItem = params.classificationItem;

    // Handle allocation based on assignmentType
    if (classItem.assignmentType === AssignmentType.CUSTOMER) {
      // Create CustomerAllocation
      await tx.customerAllocation.create({
        data: {
          seasonId: params.seasonId,
          date: params.harvestDate,
          dateHebrew: new Date(params.harvestDate).toLocaleDateString('he-IL'),
          customerId: classItem.customerId!,
          customerCategoryId: classItem.customerCategoryId!,
          pitamStatus: classItem.pitamStatus,
          quantity: classItem.quantity,
          type: 'HARVEST_IN',
          takenFrom: 'GENERAL',
          MovementReferenceId: params.classificationId,
          updatedById: params.updatedById,
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
      const shares = await this.getTraderCategoryShares(tx, params.seasonId, classItem.traderCategoryId);

      if (shares.length === 0) {
        throw new BadRequestException(
          `No trader shares found for category ${classItem.traderCategoryId} in season ${params.seasonId}`,
        );
      }

      // Pre-calculate allocations; if any trader would get 0, push everything to modulo.
      const allocations = this.calculateShareAllocations(classItem.quantity, shares);

      const canDistributeToAll = allocations.every((allocation) => allocation.quantity > 0);
      let didAddModulo = false;

      if (!canDistributeToAll) {
        await tx.traderStock.create({
          data: {
            seasonId: params.seasonId,
            date: params.harvestDate,
            traderId: null, // Modulo pool
            traderCategoryId: classItem.traderCategoryId,
            grade: classItem.grade,
            pitamStatus: classItem.pitamStatus,
            quantity: classItem.quantity,
            isModulo: true,
            type: 'HARVEST_IN',
            MovementReferenceId: params.classificationId,
            updatedById: params.updatedById,
            notes: classItem.notes,
          },
        });
        didAddModulo = true;
      } else {
        let totalAllocated = 0;

        for (const allocation of allocations) {
          await tx.traderStock.create({
            data: {
              seasonId: params.seasonId,
              date: params.harvestDate,
              traderId: allocation.share.traderId,
              traderCategoryId: classItem.traderCategoryId,
              grade: classItem.grade,
              pitamStatus: classItem.pitamStatus,
              quantity: allocation.quantity,
              isModulo: false,
              type: 'HARVEST_IN',
              MovementReferenceId: params.classificationId,
              updatedById: params.updatedById,
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
              seasonId: params.seasonId,
              date: params.harvestDate,
              traderId: null, // Modulo pool
              traderCategoryId: classItem.traderCategoryId,
              grade: classItem.grade,
              pitamStatus: classItem.pitamStatus,
              quantity: remainder,
              isModulo: true,
              type: 'HARVEST_IN',
              MovementReferenceId: params.classificationId,
              updatedById: params.updatedById,
              notes: classItem.notes,
            },
          });
          didAddModulo = true;
        }
      }

      if (didAddModulo) {
        await this.tryAssignFromModuloPool(tx, {
          seasonId: params.seasonId,
          date: params.harvestDate,
          traderCategoryId: classItem.traderCategoryId,
          grade: classItem.grade,
          pitamStatus: classItem.pitamStatus,
          updatedById: params.updatedById,
          notes: classItem.notes,
          movementReferenceId: params.classificationId,
        });
      }
    }
  }

  private async createClassificationAndAllocate(
    tx: any,
    params: {
      seasonId: number;
      harvestId: number;
      classificationItem: ClassificationBulkItemDto;
      harvestDate: Date;
      harvestDateHebrew: string;
      updatedById: number;
    },
  ) {
    const classItem = params.classificationItem;

    // Create Classification
    const classSlug = `harvest-${params.harvestId}-tcat-${classItem.traderCategoryId ?? 0}-ccat-${classItem.customerCategoryId ?? 0}-g-${classItem.grade ?? 'NA'}-pitam-${classItem.pitamStatus}-a-${classItem.assignmentType}`;

    const classification = await tx.classification.create({
      data: {
        seasonId: params.seasonId,
        fieldHarvestId: params.harvestId,
        updatedById: params.updatedById,
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

    // Process allocations using reusable method
    await this.processAllocationsForClassification(tx, {
      seasonId: params.seasonId,
      classificationId: classification.id,
      classificationItem: classItem,
      harvestDate: params.harvestDate,
      updatedById: params.updatedById,
    });

    return classification;
  }
}
