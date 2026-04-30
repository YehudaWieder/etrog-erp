// src/harvest/harvest-bulk.service.ts

import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, AssignmentType, Classification } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';
import { calculateHarvestFields } from './harvest.utils';
import {
  HarvestBulkCreateDto,
  ClassificationBulkItemDto,
  CreateHarvestClassificationDto,
  UpdateHarvestClassificationDto,
  DeleteHarvestClassificationDto,
  HarvestInlineUpdateDto,
} from 'src/docs/dto/swagger-enums.dto';

@Injectable()
export class HarvestBulkService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

  async createClassification(
    harvestId: number,
    createDto: CreateHarvestClassificationDto,
  ) {
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    return this.prisma.$transaction(async (tx) => {
      const harvest = await tx.fieldHarvest.findUnique({
        where: { id: harvestId },
        select: { id: true, dateGregorian: true },
      });

      if (!harvest) {
        throw new NotFoundException(`Harvest ${harvestId} not found`);
      }

      await this.applyHarvestInlineUpdate(tx, harvestId, createDto.harvestUpdate);

      const classSlug = `harvest-${harvestId}-tcat-${createDto.traderCategoryId ?? 0}-ccat-${createDto.customerCategoryId ?? 0}-g-${createDto.grade ?? 'NA'}-pitam-${createDto.pitamStatus}-a-${createDto.assignmentType}`;

      const existing = await tx.classification.findUnique({
        where: { slug: classSlug },
      });

      if (existing) {
        throw new ConflictException('This classification combination already exists for this harvest');
      }

      const classification = await tx.classification.create({
        data: {
          seasonId,
          fieldHarvestId: harvestId,
          updatedById: createDto.updatedById,
          assignmentType: createDto.assignmentType,
          traderId: createDto.traderId,
          customerId: createDto.customerId,
          traderCategoryId: createDto.traderCategoryId,
          customerCategoryId: createDto.customerCategoryId,
          grade: createDto.grade,
          pitamStatus: createDto.pitamStatus,
          quantity: createDto.quantity,
          notes: createDto.notes,
          slug: classSlug,
        } as any,
      });

      await this.processAllocationsForClassification(tx, {
        seasonId,
        classificationId: classification.id,
        classificationItem: this.mapToClassificationBulkItem(classification),
        harvestDate: harvest.dateGregorian,
        updatedById: createDto.updatedById,
      });

      await this.syncHarvestClassificationProgress(tx, harvestId, createDto.validationMode);

      return classification;
    });
  }

  /**
   * Update a classification and reprocess allocations if needed.
   * If only notes change: simple update. Otherwise: full reprocessing with movement reversal.
   */
  async updateClassification(
    harvestId: number,
    classificationId: number,
    updateDto: UpdateHarvestClassificationDto,
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

    const hasClassificationStructuralChanges =
      updateDto.assignmentType !== undefined ||
      updateDto.traderId !== undefined ||
      updateDto.customerId !== undefined ||
      updateDto.traderCategoryId !== undefined ||
      updateDto.customerCategoryId !== undefined ||
      updateDto.grade !== undefined ||
      updateDto.pitamStatus !== undefined ||
      updateDto.quantity !== undefined;

    const isOnlyNotesUpdate = !hasClassificationStructuralChanges && updateDto.notes !== undefined;
    const hasNoClassificationChanges = !hasClassificationStructuralChanges && updateDto.notes === undefined;

    if (isOnlyNotesUpdate) {
      return this.prisma.$transaction(async (tx) => {
        await this.applyHarvestInlineUpdate(tx, harvestId, updateDto.harvestUpdate);

        const updated = await tx.classification.update({
          where: { id: classificationId },
          data: { notes: updateDto.notes },
        });

        await this.syncHarvestClassificationProgress(tx, harvestId, updateDto.validationMode);

        return updated;
      });
    }

    if (hasNoClassificationChanges) {
      return this.prisma.$transaction(async (tx) => {
        await this.applyHarvestInlineUpdate(tx, harvestId, updateDto.harvestUpdate);
        await this.syncHarvestClassificationProgress(tx, harvestId, updateDto.validationMode);

        return tx.classification.findUnique({ where: { id: classificationId } });
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

      await this.applyHarvestInlineUpdate(tx, harvestId, updateDto.harvestUpdate);

      const newQuantity = updateDto.quantity ?? oldClassification.quantity;

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
      await this.processAllocationsForClassification(tx, {
        seasonId,
        classificationId: classificationId,
        classificationItem: this.mapToClassificationBulkItem(updatedClassification),
        harvestDate: harvest.dateGregorian,
        updatedById: updateDto.updatedById,
      });

      await this.syncHarvestClassificationProgress(tx, harvestId, updateDto.validationMode);

      return updatedClassification;
    });
  }

  async deleteClassification(
    harvestId: number,
    classificationId: number,
    deleteDto: DeleteHarvestClassificationDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const classification = await tx.classification.findUnique({
        where: { id: classificationId },
        select: { id: true, fieldHarvestId: true },
      });

      if (!classification) {
        throw new NotFoundException(`Classification ${classificationId} not found`);
      }

      if (classification.fieldHarvestId !== harvestId) {
        throw new BadRequestException(
          `Classification ${classificationId} does not belong to harvest ${harvestId}`,
        );
      }

      await this.applyHarvestInlineUpdate(tx, harvestId, deleteDto.harvestUpdate);

      await tx.customerAllocation.deleteMany({
        where: { MovementReferenceId: classificationId },
      });

      await tx.traderStock.deleteMany({
        where: { MovementReferenceId: classificationId },
      });

      const deleted = await tx.classification.delete({
        where: { id: classificationId },
      });

      await this.syncHarvestClassificationProgress(tx, harvestId, deleteDto.validationMode);

      return deleted;
    });
  }

  private async applyHarvestInlineUpdate(
    tx: any,
    harvestId: number,
    harvestUpdate?: HarvestInlineUpdateDto,
  ) {
    if (!harvestUpdate) {
      return;
    }

    const hasAnyField =
      harvestUpdate.totalHarvested !== undefined ||
      harvestUpdate.totalRejected !== undefined ||
      harvestUpdate.ownerHarvested !== undefined ||
      harvestUpdate.ownerRejected !== undefined ||
      harvestUpdate.notes !== undefined ||
      harvestUpdate.updatedById !== undefined;

    if (!hasAnyField) {
      return;
    }

    const current = await tx.fieldHarvest.findUnique({
      where: { id: harvestId },
      select: {
        id: true,
        totalHarvested: true,
        totalRejected: true,
        ownerHarvested: true,
        ownerRejected: true,
      },
    });

    if (!current) {
      throw new NotFoundException(`Harvest ${harvestId} not found`);
    }

    const totalHarvested = harvestUpdate.totalHarvested ?? current.totalHarvested;
    const totalRejected = harvestUpdate.totalRejected ?? current.totalRejected;
    const ownerHarvested = harvestUpdate.ownerHarvested ?? current.ownerHarvested;
    const ownerRejected = harvestUpdate.ownerRejected ?? current.ownerRejected;

    await tx.fieldHarvest.update({
      where: { id: harvestId },
      data: {
        totalHarvested,
        totalRejected,
        ownerHarvested,
        ownerRejected,
        notes: harvestUpdate.notes,
        updatedById: harvestUpdate.updatedById,
        rejectionRate: totalHarvested > 0 ? (totalRejected / totalHarvested) * 100 : 0,
        ownerRejectionRate: ownerHarvested > 0 ? (ownerRejected / ownerHarvested) * 100 : 0,
        totalAfterRejected: Math.max(totalHarvested - totalRejected, 0),
        ownerAfterRejected: Math.max(ownerHarvested - ownerRejected, 0),
      },
    });
  }

  private async syncHarvestClassificationProgress(
    tx: any,
    harvestId: number,
    validationMode: 'PARTIAL' | 'FINAL',
  ) {
    const harvest = await tx.fieldHarvest.findUnique({
      where: { id: harvestId },
      select: {
        id: true,
        totalAfterRejected: true,
        isPartialClassification: true,
      },
    });

    if (!harvest) {
      throw new NotFoundException(`Harvest ${harvestId} not found`);
    }

    const classifiedAgg = await tx.classification.aggregate({
      _sum: { quantity: true },
      where: { fieldHarvestId: harvestId, isDeleted: false },
    });

    const classifiedTotal = classifiedAgg._sum.quantity ?? 0;
    const totalAfterRejected = harvest.totalAfterRejected;

    if (classifiedTotal > totalAfterRejected) {
      throw new BadRequestException(
        `Total classifications quantity (${classifiedTotal}) cannot exceed net harvested quantity (${totalAfterRejected})`,
      );
    }

    if (validationMode === 'FINAL' && classifiedTotal !== totalAfterRejected) {
      throw new BadRequestException(
        `Total classifications quantity (${classifiedTotal}) must equal net harvested quantity (${totalAfterRejected}) in FINAL mode`,
      );
    }

    await tx.fieldHarvest.update({
      where: { id: harvestId },
      data: {
        classifiedTotal,
        isPartialClassification: validationMode === 'PARTIAL',
      },
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

      const classifiedTotal = bulkDto.classifications.reduce(
        (sum, item) => sum + (item.quantity || 0),
        0,
      );

      const rates = calculateHarvestFields({
        totalHarvested: bulkDto.totalHarvested,
        totalRejected: bulkDto.totalRejected,
        ownerHarvested: bulkDto.ownerHarvested,
        ownerRejected: bulkDto.ownerRejected,
        classifiedTotal,
        isPartialClassification: bulkDto.isPartialClassification,
      });

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
          notes: bulkDto.notes,
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

    const totalRejected = data.totalRejected || 0;
    const netHarvested = Math.max((data.totalHarvested || 0) - totalRejected, 0);
    const classificationsTotal = data.classifications.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0,
    );

    if (classificationsTotal > netHarvested) {
      throw new BadRequestException(
        `Total classifications quantity (${classificationsTotal}) cannot exceed net harvested quantity (${netHarvested})`,
      );
    }

    if (data.isPartialClassification) {
      return;
    }

    if (classificationsTotal !== netHarvested) {
      throw new BadRequestException(
        `Total classifications quantity (${classificationsTotal}) must equal net harvested quantity (${netHarvested})`,
      );
    }
  }

  private mapToClassificationBulkItem(c: Classification): ClassificationBulkItemDto {
    return {
      assignmentType: c.assignmentType,
      traderId: c.traderId ?? undefined,
      customerId: c.customerId ?? undefined,
      traderCategoryId: c.traderCategoryId ?? undefined,
      customerCategoryId: c.customerCategoryId ?? undefined,
      grade: c.grade ?? undefined,
      pitamStatus: c.pitamStatus,
      quantity: c.quantity,
      notes: c.notes ?? undefined,
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

  async processAllocationsForClassification(
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
      if (!classItem.traderId) {
        throw new BadRequestException('traderId is required for TRADER classifications');
      }

      if (!classItem.traderCategoryId) {
        throw new BadRequestException('traderCategoryId is required for TRADER classifications');
      }

      if (!classItem.grade) {
        throw new BadRequestException('grade is required for TRADER classifications');
      }

      await tx.traderStock.create({
        data: {
          seasonId: params.seasonId,
          date: params.harvestDate,
          traderId: classItem.traderId,
          traderCategoryId: classItem.traderCategoryId,
          grade: classItem.grade,
          pitamStatus: classItem.pitamStatus,
          quantity: classItem.quantity,
          isModulo: false,
          type: 'HARVEST_IN',
          MovementReferenceId: params.classificationId,
          updatedById: params.updatedById,
          notes: classItem.notes,
        },
      });
    } else if (classItem.assignmentType === AssignmentType.GENERAL) {
      if (!classItem.traderCategoryId) {
        throw new BadRequestException('traderCategoryId is required for GENERAL classifications');
      }

      if (!classItem.grade) {
        throw new BadRequestException('grade is required for GENERAL classifications');
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
    } else {
      throw new BadRequestException(
        `Unsupported assignmentType for allocation processing: ${classItem.assignmentType}`,
      );
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
