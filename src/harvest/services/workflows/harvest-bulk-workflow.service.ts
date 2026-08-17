// src/harvest/services/workflows/harvest-bulk-workflow.service.ts

import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, AssignmentType, Classification } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';
import { calculateHarvestFields } from 'src/harvest/services/harvest-core/utils/harvest-fields.util';
import {
  HarvestBulkCreateDto,
  ClassificationBulkItemDto,
  CreateHarvestClassificationDto,
  UpdateHarvestClassificationDto,
  DeleteHarvestClassificationDto,
  HarvestInlineUpdateDto,
} from 'src/harvest/services/harvest-core/dto/harvest.dto';
import {
  assertClassificationsMatchHarvested,
  assertFinalClassificationConsistency,
  assertGeneralAssignmentIds,
  assertNoDuplicateClassifications,
  assertUncalculatedRejectedWithinTotal,
  buildClassificationDuplicateKey,
} from 'src/harvest/services/harvest-core/rules/harvest-validation.rules';
import { HarvestAllocationService } from 'src/harvest/services/workflows/harvest-allocation.service';
import { InventoryAvailabilityService } from 'src/inventory/services/inventory-availability.service';
import { Grade, MovementType, PitamStatus } from '@prisma/client';
import { AuditLogService } from 'src/audit/audit.service';

@Injectable()
export class HarvestBulkWorkflowService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
    private readonly allocationService: HarvestAllocationService,
    private readonly inventoryAvailabilityService: InventoryAvailabilityService,
    private readonly auditLog: AuditLogService,
  ) {}

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

  private async createClassificationAndAllocate(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: number;
      harvestId: number;
      classificationItem: ClassificationBulkItemDto;
      harvestDate: Date;
      harvestDateHebrew: string;
      updatedById: number;
      remainsInItalyGradeH: boolean;
      remainsInItalyGradeV: boolean;
    },
  ) {
    const classItem = params.classificationItem;
    assertGeneralAssignmentIds(classItem);

    // Create Classification
    const classSlug = `harvest-${params.harvestId}-t-${classItem.traderId ?? 0}-c-${classItem.customerId ?? 0}-tcat-${classItem.traderCategoryId ?? 0}-ccat-${classItem.customerCategoryId ?? 0}-g-${classItem.grade ?? 'NA'}-pitam-${classItem.pitamStatus}-a-${classItem.assignmentType}`;

    // A previously soft-deleted classification with the same natural key would still hold this
    // slug (unique regardless of isDeleted) and block creation. New data supersedes the trashed
    // row, so purge it before inserting — it also becomes unrestorable at that point.
    await tx.classification.deleteMany({ where: { slug: classSlug, isDeleted: true } });

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
      },
    });

    // Process allocations using reusable method
    await this.allocationService.processAllocationsForClassification(tx, {
      seasonId: params.seasonId,
      classificationId: classification.id,
      classificationItem: classItem,
      harvestDate: params.harvestDate,
      updatedById: params.updatedById,
      remainsInItalyGradeH: params.remainsInItalyGradeH,
      remainsInItalyGradeV: params.remainsInItalyGradeV,
    });

    await this.auditLog.record({
      userId: params.updatedById,
      action: 'CREATE',
      entityType: 'Classification',
      entityId: classification.id,
      after: classification,
    });

    return classification;
  }

  private async applyHarvestInlineUpdate(
    tx: Prisma.TransactionClient,
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
      harvestUpdate.uncalculatedRejected !== undefined ||
      harvestUpdate.remainsInItalyGradeH !== undefined ||
      harvestUpdate.remainsInItalyGradeV !== undefined ||
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
        uncalculatedRejected: true,
      },
    });

    if (!current) {
      throw new NotFoundException(`Harvest ${harvestId} not found`);
    }

    const totalHarvested = harvestUpdate.totalHarvested ?? current.totalHarvested;
    const totalRejected = harvestUpdate.totalRejected ?? current.totalRejected;
    const uncalculatedRejected = harvestUpdate.uncalculatedRejected ?? current.uncalculatedRejected;
    assertUncalculatedRejectedWithinTotal(totalRejected, uncalculatedRejected);
    const ownerFieldsProvided = harvestUpdate.ownerHarvested !== undefined || harvestUpdate.ownerRejected !== undefined;
    const currentHasExplicitOwnerData =
      current.ownerHarvested > 0 ||
      current.ownerRejected > 0;
    const ownerHarvested = ownerFieldsProvided
      ? (harvestUpdate.ownerHarvested ?? current.ownerHarvested)
      : currentHasExplicitOwnerData
        ? current.ownerHarvested
        : totalHarvested;
    const ownerRejected = ownerFieldsProvided
      ? (harvestUpdate.ownerRejected ?? current.ownerRejected)
      : currentHasExplicitOwnerData
        ? current.ownerRejected
        : totalRejected;

    await tx.fieldHarvest.update({
      where: { id: harvestId },
      data: {
        totalHarvested,
        totalRejected,
        ownerHarvested,
        ownerRejected,
        notes: harvestUpdate.notes,
        uncalculatedRejected: harvestUpdate.uncalculatedRejected,
        remainsInItalyGradeH: harvestUpdate.remainsInItalyGradeH,
        remainsInItalyGradeV: harvestUpdate.remainsInItalyGradeV,
        updatedById: harvestUpdate.updatedById,
        rejectionRate: totalHarvested > 0 ? (totalRejected / totalHarvested) * 100 : 0,
        ownerRejectionRate: ownerHarvested > 0 ? (ownerRejected / ownerHarvested) * 100 : 0,
        totalAfterRejected: Math.max(totalHarvested - totalRejected, 0),
        ownerAfterRejected: Math.max(ownerHarvested - ownerRejected, 0),
      },
    });
  }

  private async syncHarvestClassificationProgress(
    tx: Prisma.TransactionClient,
    harvestId: number,
    isPartialClassification: boolean,
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

    // Once classifications fully cover the net harvested quantity, the report is complete
    // regardless of the partial flag the caller passed in (which may be stale from before this
    // create/update/delete brought the total to an exact match).
    const effectiveIsPartialClassification =
      classifiedTotal >= totalAfterRejected ? false : isPartialClassification;

    assertFinalClassificationConsistency(classifiedTotal, totalAfterRejected, effectiveIsPartialClassification);

    await tx.fieldHarvest.update({
      where: { id: harvestId },
      data: {
        classifiedTotal,
        isPartialClassification: effectiveIsPartialClassification,
      },
    });
  }

  async createClassification(
    harvestId: number,
    createDto: CreateHarvestClassificationDto,
    actorId: number,
  ) {
    const createPayload = { ...createDto, updatedById: actorId };
    assertGeneralAssignmentIds(createPayload);
    const { id: seasonId, yearName: activeSeasonYearName } = await this.seasonsService.findActiveSeason();
    return this.prisma.$transaction(async (tx) =>
      this.createClassificationInTx(tx, seasonId, activeSeasonYearName, harvestId, createPayload),
    );
  }

  async restoreClassification(
    deletedClassificationId: number,
    harvestId: number,
    createDto: CreateHarvestClassificationDto,
    actorId: number,
  ) {
    const createPayload = { ...createDto, updatedById: actorId };
    assertGeneralAssignmentIds(createPayload);
    const { id: seasonId, yearName: activeSeasonYearName } = await this.seasonsService.findActiveSeason();
    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.classification.findFirst({
        where: { id: deletedClassificationId, isDeleted: true },
        select: { id: true },
      });
      if (!deleted) {
        throw new NotFoundException(`Deleted classification ${deletedClassificationId} not found`);
      }
      await tx.classification.delete({ where: { id: deletedClassificationId } });
      return this.createClassificationInTx(tx, seasonId, activeSeasonYearName, harvestId, createPayload);
    });
  }

  // Duplicate-check + create + allocate for one new classification. Tx-scoped and reusable by any
  // caller that already resolved the harvest and holds an open transaction (e.g. saveSortingBatch,
  // which creates several classifications alongside edits in one transaction).
  private async createClassificationEntryInTx(
    tx: Prisma.TransactionClient,
    seasonId: number,
    harvestId: number,
    harvestDate: Date,
    item: ClassificationBulkItemDto,
    updatedById: number,
    remainsInItalyGradeH: boolean,
    remainsInItalyGradeV: boolean,
  ) {
    const duplicateKey = buildClassificationDuplicateKey(item);

    const existingClassifications = await tx.classification.findMany({
      where: { fieldHarvestId: harvestId, isDeleted: false },
      select: {
        assignmentType: true,
        traderId: true,
        customerId: true,
        traderCategoryId: true,
        customerCategoryId: true,
        grade: true,
        pitamStatus: true,
      },
    });

    const hasDuplicate = existingClassifications.some(
      (classification) => buildClassificationDuplicateKey(classification) === duplicateKey,
    );

    if (hasDuplicate) {
      throw new ConflictException('This classification combination already exists for this harvest');
    }

    const classSlug = `harvest-${harvestId}-t-${item.traderId ?? 0}-c-${item.customerId ?? 0}-tcat-${item.traderCategoryId ?? 0}-ccat-${item.customerCategoryId ?? 0}-g-${item.grade ?? 'NA'}-pitam-${item.pitamStatus}-a-${item.assignmentType}`;

    // A previously soft-deleted classification with the same natural key would still hold this
    // slug (unique regardless of isDeleted) and block creation. New data supersedes the trashed
    // row, so purge it before inserting — it also becomes unrestorable at that point.
    await tx.classification.deleteMany({ where: { slug: classSlug, isDeleted: true } });

    const classification = await tx.classification.create({
      data: {
        seasonId,
        fieldHarvestId: harvestId,
        updatedById,
        assignmentType: item.assignmentType,
        traderId: item.traderId,
        customerId: item.customerId,
        traderCategoryId: item.traderCategoryId,
        customerCategoryId: item.customerCategoryId,
        grade: item.grade,
        pitamStatus: item.pitamStatus,
        quantity: item.quantity,
        notes: item.notes,
        slug: classSlug,
      },
    });

    await this.allocationService.processAllocationsForClassification(tx, {
      seasonId,
      classificationId: classification.id,
      classificationItem: this.mapToClassificationBulkItem(classification),
      harvestDate,
      updatedById,
      remainsInItalyGradeH,
      remainsInItalyGradeV,
    });

    await this.auditLog.record({
      userId: updatedById,
      action: 'CREATE',
      entityType: 'Classification',
      entityId: classification.id,
      after: classification,
    });

    return classification;
  }

  private async createClassificationInTx(
    tx: Prisma.TransactionClient,
    seasonId: number,
    activeSeasonYearName: number,
    harvestId: number,
    createPayload: CreateHarvestClassificationDto & { updatedById: number },
  ) {
    const harvest = await tx.fieldHarvest.findUnique({
      where: { id: harvestId },
      select: { id: true, dateGregorian: true, remainsInItalyGradeH: true, remainsInItalyGradeV: true },
    });

    if (!harvest) {
      throw new NotFoundException(`Harvest ${harvestId} not found`);
    }

    const harvestYear = harvest.dateGregorian.getFullYear();
    if (harvestYear !== activeSeasonYearName) {
      throw new BadRequestException(
        `Harvest date year (${harvestYear}) does not match the active season year (${activeSeasonYearName})`,
      );
    }

    await this.applyHarvestInlineUpdate(tx, harvestId, createPayload.harvestUpdate);

    const classification = await this.createClassificationEntryInTx(
      tx,
      seasonId,
      harvestId,
      harvest.dateGregorian,
      createPayload,
      createPayload.updatedById,
      createPayload.harvestUpdate?.remainsInItalyGradeH ?? harvest.remainsInItalyGradeH,
      createPayload.harvestUpdate?.remainsInItalyGradeV ?? harvest.remainsInItalyGradeV,
    );

    await this.syncHarvestClassificationProgress(tx, harvestId, createPayload.isPartialClassification);

    return classification;
  }

  /**
   * Bulk create: FieldHarvest + Classifications + CustomerAllocations/TraderStocks
   * All in a single transaction.
   */
  async createHarvestWithClassifications(bulkDto: HarvestBulkCreateDto, actorId: number) {
    const bulkPayload = {
      ...bulkDto,
      classifications: bulkDto.classifications ?? [],
      updatedById: actorId,
    };

    // 1. Validate no duplicate classifications
    assertNoDuplicateClassifications(bulkPayload.classifications);
    assertClassificationsMatchHarvested(bulkPayload);
    assertUncalculatedRejectedWithinTotal(bulkPayload.totalRejected || 0, bulkPayload.uncalculatedRejected ?? 0);

    // 2. Get active season
    const { id: seasonId, yearName: activeSeasonYearName } = await this.seasonsService.findActiveSeason();

    const harvestYear = new Date(bulkPayload.dateGregorian).getFullYear();
    if (harvestYear !== activeSeasonYearName) {
      throw new BadRequestException(
        `Harvest date year (${harvestYear}) does not match the active season year (${activeSeasonYearName})`,
      );
    }

    // 3. Execute entire flow in transaction
    return this.prisma.$transaction(async (tx) => {
      // 3a. Create FieldHarvest
      const dateStr = new Date(bulkPayload.dateGregorian).toISOString().split('T')[0];
      const slug = `${dateStr}-f${bulkPayload.fieldId}-s${seasonId}`;

      const existingHarvest = await tx.fieldHarvest.findUnique({ where: { slug } });
      if (existingHarvest) {
        throw new ConflictException('A report for this field and date already exists');
      }

      const classifiedTotal = bulkPayload.classifications.reduce(
        (sum, item) => sum + (item.quantity || 0),
        0,
      );

      const rates = calculateHarvestFields({
        totalHarvested: bulkPayload.totalHarvested,
        totalRejected: bulkPayload.totalRejected,
        ownerHarvested: bulkPayload.ownerHarvested ?? bulkPayload.totalHarvested,
        ownerRejected: bulkPayload.ownerRejected ?? bulkPayload.totalRejected,
        classifiedTotal,
        isPartialClassification: bulkPayload.isPartialClassification,
      });

      const ownerHarvested = bulkPayload.ownerHarvested ?? bulkPayload.totalHarvested;
      const ownerRejected = bulkPayload.ownerRejected ?? bulkPayload.totalRejected;

      const harvest = await tx.fieldHarvest.create({
        data: {
          seasonId,
          dateGregorian: new Date(bulkPayload.dateGregorian),
          dateHebrew: bulkPayload.dateHebrew,
          fieldId: bulkPayload.fieldId,
          updatedById: bulkPayload.updatedById,
          totalHarvested: bulkPayload.totalHarvested || 0,
          totalRejected: bulkPayload.totalRejected || 0,
          ownerHarvested,
          ownerRejected,
          notes: bulkPayload.notes,
          uncalculatedRejected: bulkPayload.uncalculatedRejected ?? 0,
          remainsInItalyGradeH: bulkPayload.remainsInItalyGradeH ?? true,
          remainsInItalyGradeV: bulkPayload.remainsInItalyGradeV ?? true,
          slug,
          ...rates,
        },
      });

      // 3b. Process each classification
      const classifications: Classification[] = [];
      for (const classItem of bulkPayload.classifications) {
        const classification = await this.createClassificationAndAllocate(tx, {
          seasonId,
          harvestId: harvest.id,
          classificationItem: classItem,
          harvestDate: new Date(bulkPayload.dateGregorian),
          harvestDateHebrew: bulkPayload.dateHebrew,
          updatedById: bulkPayload.updatedById,
          remainsInItalyGradeH: harvest.remainsInItalyGradeH,
          remainsInItalyGradeV: harvest.remainsInItalyGradeV,
        });

        classifications.push(classification);
      }

      return {
        harvest,
        classifications,
      };
    }).then(async (result) => {
      await this.auditLog.record({
        userId: bulkPayload.updatedById,
        action: 'CREATE',
        entityType: 'FieldHarvest',
        entityId: result.harvest.id,
        after: result.harvest,
      });

      return result;
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
    actorId: number,
  ) {
    const updatePayload = {
      ...updateDto,
      updatedById: actorId,
    };

    // Get the old classification
    const oldClassification = await this.prisma.classification.findFirst({
      where: { id: classificationId, isDeleted: false },
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
      updatePayload.assignmentType !== undefined ||
      updatePayload.traderId !== undefined ||
      updatePayload.customerId !== undefined ||
      updatePayload.traderCategoryId !== undefined ||
      updatePayload.customerCategoryId !== undefined ||
      updatePayload.grade !== undefined ||
      updatePayload.pitamStatus !== undefined ||
      updatePayload.quantity !== undefined;

    const isOnlyNotesUpdate = !hasClassificationStructuralChanges && updatePayload.notes !== undefined;
    const hasNoClassificationChanges = !hasClassificationStructuralChanges && updatePayload.notes === undefined;

    if (isOnlyNotesUpdate) {
      const updated = await this.prisma.$transaction(async (tx) => {
        await this.applyHarvestInlineUpdate(tx, harvestId, updatePayload.harvestUpdate);

        const updated = await tx.classification.update({
          where: { id: classificationId },
          data: { notes: updatePayload.notes, updatedById: updatePayload.updatedById },
        });

        await this.syncHarvestClassificationProgress(tx, harvestId, updatePayload.isPartialClassification);

        return updated;
      });

      await this.auditLog.record({
        userId: actorId,
        action: 'UPDATE',
        entityType: 'Classification',
        entityId: classificationId,
        before: oldClassification,
        after: updated,
      });

      return updated;
    }

    if (hasNoClassificationChanges) {
      return this.prisma.$transaction(async (tx) => {
        await this.applyHarvestInlineUpdate(tx, harvestId, updatePayload.harvestUpdate);
        await this.syncHarvestClassificationProgress(tx, harvestId, updatePayload.isPartialClassification);

        return tx.classification.findUnique({ where: { id: classificationId } });
      });
    }

    // Full reprocessing with movement reversal
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    const updatedClassification = await this.prisma.$transaction(async (tx) => {
      const newQuantity = updatePayload.quantity ?? oldClassification.quantity;

      // Get the harvest to update quantities
      const harvest = await tx.fieldHarvest.findUnique({
        where: { id: harvestId },
      });

      if (!harvest) {
        throw new NotFoundException(`Harvest ${harvestId} not found`);
      }

      const remainsInItalyGradeH =
        updatePayload.harvestUpdate?.remainsInItalyGradeH ?? harvest.remainsInItalyGradeH;
      const remainsInItalyGradeV =
        updatePayload.harvestUpdate?.remainsInItalyGradeV ?? harvest.remainsInItalyGradeV;

      // If quantity is being reduced, assert enough unpackaged inventory exists to absorb the decrease
      if (newQuantity < oldClassification.quantity) {
        const delta = oldClassification.quantity - newQuantity;
        await this.assertInventoryCanRelease(
          tx,
          oldClassification,
          delta,
          'Update classification quantity',
          remainsInItalyGradeH,
          remainsInItalyGradeV,
        );
      }

      // Delete all old movements linked to this classification
      await this.allocationService.deleteLinkedMovements(tx, classificationId);

      await this.applyHarvestInlineUpdate(tx, harvestId, updatePayload.harvestUpdate);

      const nextAssignmentType =
        updatePayload.assignmentType ?? oldClassification.assignmentType;

      assertGeneralAssignmentIds({
        assignmentType: nextAssignmentType,
        traderId: updatePayload.traderId,
        customerId: updatePayload.customerId,
      });

      const nextTraderId =
        nextAssignmentType === AssignmentType.GENERAL
          ? null
          : (updatePayload.traderId ?? oldClassification.traderId);

      const nextCustomerId =
        nextAssignmentType === AssignmentType.GENERAL
          ? null
          : (updatePayload.customerId ?? oldClassification.customerId);

      // Update classification with new values
      const updatedClassification = await tx.classification.update({
        where: { id: classificationId },
        data: {
          assignmentType: nextAssignmentType,
          traderId: nextTraderId,
          customerId: nextCustomerId,
          traderCategoryId: updatePayload.traderCategoryId ?? oldClassification.traderCategoryId,
          customerCategoryId: updatePayload.customerCategoryId ?? oldClassification.customerCategoryId,
          grade: updatePayload.grade ?? oldClassification.grade,
          pitamStatus: updatePayload.pitamStatus ?? oldClassification.pitamStatus,
          quantity: newQuantity,
          notes: updatePayload.notes ?? oldClassification.notes,
          updatedById: updatePayload.updatedById,
        },
      });

      // Recreate allocations with updated data
      await this.allocationService.processAllocationsForClassification(tx, {
        seasonId,
        classificationId: classificationId,
        classificationItem: this.mapToClassificationBulkItem(updatedClassification),
        harvestDate: harvest.dateGregorian,
        updatedById: updatePayload.updatedById,
        remainsInItalyGradeH,
        remainsInItalyGradeV,
      });

      await this.syncHarvestClassificationProgress(tx, harvestId, updatePayload.isPartialClassification);

      return updatedClassification;
    }, {
      // This path deletes and recreates allocation movements (trader stock / customer allocation
      // writes and availability checks), which can exceed Prisma's default 5s transaction timeout
      // under load. Give it a lot of headroom before failing outright, especially under a
      // slow/loaded DB.
      timeout: 300_000,
    });

    await this.auditLog.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Classification',
      entityId: classificationId,
      before: oldClassification,
      after: updatedClassification,
    });

    return updatedClassification;
  }

  // Quantity-only edit for an existing classification: deletes and recreates its allocation
  // movements, but leaves assignment/category/grade/pitam untouched. Tx-scoped and reusable by
  // any caller that already resolved the harvest and holds an open transaction (e.g.
  // saveSortingBatch, which edits several classifications alongside creates in one transaction).
  private async applyClassificationQuantityEditInTx(
    tx: Prisma.TransactionClient,
    seasonId: number,
    harvestId: number,
    harvestDate: Date,
    classificationId: number,
    newQuantity: number,
    updatedById: number,
    remainsInItalyGradeH: boolean,
    remainsInItalyGradeV: boolean,
  ) {
    const oldClassification = await tx.classification.findFirst({
      where: { id: classificationId, isDeleted: false },
    });

    if (!oldClassification) {
      throw new NotFoundException(`Classification ${classificationId} not found`);
    }

    if (oldClassification.fieldHarvestId !== harvestId) {
      throw new BadRequestException(
        `Classification ${classificationId} does not belong to harvest ${harvestId}`,
      );
    }

    if (newQuantity === oldClassification.quantity) {
      return oldClassification;
    }

    // If quantity is being reduced, assert enough unpackaged inventory exists to absorb the decrease
    if (newQuantity < oldClassification.quantity) {
      const delta = oldClassification.quantity - newQuantity;
      await this.assertInventoryCanRelease(
        tx,
        oldClassification,
        delta,
        'Update classification quantity',
        remainsInItalyGradeH,
        remainsInItalyGradeV,
      );
    }

    await this.allocationService.deleteLinkedMovements(tx, classificationId);

    if (newQuantity === 0) {
      const deleted = await tx.classification.delete({ where: { id: classificationId } });

      await this.auditLog.record({
        userId: updatedById,
        action: 'DELETE',
        entityType: 'Classification',
        entityId: classificationId,
        before: oldClassification,
      });

      return deleted;
    }

    const updatedClassification = await tx.classification.update({
      where: { id: classificationId },
      data: { quantity: newQuantity, updatedById },
    });

    await this.allocationService.processAllocationsForClassification(tx, {
      seasonId,
      classificationId,
      classificationItem: this.mapToClassificationBulkItem(updatedClassification),
      harvestDate,
      updatedById,
      remainsInItalyGradeH,
      remainsInItalyGradeV,
    });

    await this.auditLog.record({
      userId: updatedById,
      action: 'UPDATE',
      entityType: 'Classification',
      entityId: classificationId,
      before: oldClassification,
      after: updatedClassification,
    });

    return updatedClassification;
  }

  /**
   * Edits quantities of existing classifications and creates new ones on the same harvest, all in
   * one transaction — either everything is saved, or nothing is. This is what the "add sorting"
   * form's save button calls when it has both pencil-edited existing cells and new sorting rows.
   */
  async saveSortingBatch(
    harvestId: number,
    edits: { classificationId: number; quantity: number }[],
    creates: ClassificationBulkItemDto[],
    isPartialClassification: boolean,
    actorId: number,
    harvestUpdate?: HarvestInlineUpdateDto,
  ) {
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    return this.prisma.$transaction(async (tx) => {
      const harvest = await tx.fieldHarvest.findUnique({
        where: { id: harvestId },
        select: { id: true, dateGregorian: true, remainsInItalyGradeH: true, remainsInItalyGradeV: true },
      });

      if (!harvest) {
        throw new NotFoundException(`Harvest ${harvestId} not found`);
      }

      await this.applyHarvestInlineUpdate(tx, harvestId, harvestUpdate);

      const remainsInItalyGradeH = harvestUpdate?.remainsInItalyGradeH ?? harvest.remainsInItalyGradeH;
      const remainsInItalyGradeV = harvestUpdate?.remainsInItalyGradeV ?? harvest.remainsInItalyGradeV;

      for (const edit of edits) {
        await this.applyClassificationQuantityEditInTx(
          tx,
          seasonId,
          harvestId,
          harvest.dateGregorian,
          edit.classificationId,
          edit.quantity,
          actorId,
          remainsInItalyGradeH,
          remainsInItalyGradeV,
        );
      }

      const created: Classification[] = [];
      for (const item of creates) {
        assertGeneralAssignmentIds(item);
        const classification = await this.createClassificationEntryInTx(
          tx,
          seasonId,
          harvestId,
          harvest.dateGregorian,
          item,
          actorId,
          remainsInItalyGradeH,
          remainsInItalyGradeV,
        );
        created.push(classification);
      }

      await this.syncHarvestClassificationProgress(tx, harvestId, isPartialClassification);

      return { editedCount: edits.length, created };
    }, {
      // Batches quantity edits (each deletes/recreates allocation movements) and new-classification
      // creates in one transaction so the whole save is atomic. Can involve many sequential
      // queries; give it a lot of headroom before failing outright.
      timeout: 300_000,
    });
  }

  async deleteClassification(
    harvestId: number,
    classificationId: number,
    deleteDto: DeleteHarvestClassificationDto,
    actorId: number,
  ) {
    const deletePayload = {
      ...deleteDto,
      updatedById: actorId,
    };

    try {
      const deleted = await this.prisma.$transaction(async (tx) => {
        const classification = await tx.classification.findFirst({
          where: { id: classificationId, isDeleted: false },
          select: {
            id: true,
            fieldHarvestId: true,
            assignmentType: true,
            traderId: true,
            traderCategoryId: true,
            grade: true,
            pitamStatus: true,
            customerId: true,
            customerCategoryId: true,
            quantity: true,
            seasonId: true,
          },
        });

        if (!classification) {
          throw new NotFoundException(`Classification ${classificationId} not found`);
        }

        if (classification.fieldHarvestId !== harvestId) {
          throw new BadRequestException(
            `Classification ${classificationId} does not belong to harvest ${harvestId}`,
          );
        }

        const harvest = await tx.fieldHarvest.findUnique({
          where: { id: harvestId },
          select: { remainsInItalyGradeH: true, remainsInItalyGradeV: true },
        });

        if (!harvest) {
          throw new NotFoundException(`Harvest ${harvestId} not found`);
        }

        const remainsInItalyGradeH =
          deletePayload.harvestUpdate?.remainsInItalyGradeH ?? harvest.remainsInItalyGradeH;
        const remainsInItalyGradeV =
          deletePayload.harvestUpdate?.remainsInItalyGradeV ?? harvest.remainsInItalyGradeV;

        await this.assertInventoryAvailableForDeletion(
          tx,
          classification,
          remainsInItalyGradeH,
          remainsInItalyGradeV,
        );

        await this.applyHarvestInlineUpdate(tx, harvestId, deletePayload.harvestUpdate);

        await this.allocationService.deleteLinkedMovements(tx, classificationId);

        const deleted = await tx.classification.update({
          where: { id: classificationId },
          data: { isDeleted: true, updatedById: actorId },
        });

        await this.syncHarvestClassificationProgress(tx, harvestId, deletePayload.isPartialClassification);

        return deleted;
      }, {
        // Deletes and recreates allocation movements (trader stock / customer allocation writes
        // and availability checks), which can exceed Prisma's default 5s transaction timeout under
        // load. Give it a lot of headroom before failing outright, especially under a slow/loaded DB.
        timeout: 300_000,
      });

      await this.auditLog.record({
        userId: actorId,
        action: 'DELETE',
        entityType: 'Classification',
        entityId: classificationId,
        before: deleted,
      });

      return deleted;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Cannot delete classification because related records exist in the system.');
      }

      throw error;
    }
  }

  private async assertInventoryCanRelease(
    tx: Prisma.TransactionClient,
    classification: {
      assignmentType: string;
      traderId: number | null;
      traderCategoryId: number | null;
      grade: string | null;
      pitamStatus: string | null;
      customerId: number | null;
      customerCategoryId: number | null;
      seasonId: number;
    },
    releasedQuantity: number,
    contextLabel: string,
    remainsInItalyGradeH: boolean,
    remainsInItalyGradeV: boolean,
  ) {
    const { assignmentType, seasonId } = classification;

    if (assignmentType === AssignmentType.TRADER) {
      await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(tx, {
        seasonId,
        traderId: classification.traderId,
        traderCategoryId: classification.traderCategoryId!,
        grade: classification.grade as Grade,
        pitamStatus: classification.pitamStatus as PitamStatus,
        isModulo: false,
        requiredQuantity: releasedQuantity,
        contextLabel,
      });
      return;
    }

    if (assignmentType === AssignmentType.CUSTOMER) {
      await this.inventoryAvailabilityService.assertCustomerHasUnshippedStock(tx, {
        seasonId,
        customerId: classification.customerId!,
        customerCategoryId: classification.customerCategoryId!,
        pitamStatus: classification.pitamStatus as PitamStatus,
        requiredQuantity: releasedQuantity,
        contextLabel,
      });
      return;
    }

    if (assignmentType === AssignmentType.GENERAL) {
      const isRemainsInItaly =
        (classification.grade === Grade.ה && remainsInItalyGradeH) ||
        (classification.grade === Grade.ו && remainsInItalyGradeV);

      const result = await tx.traderStock.aggregate({
        where: {
          seasonId,
          traderCategoryId: classification.traderCategoryId!,
          grade: classification.grade as Grade,
          pitamStatus: classification.pitamStatus as PitamStatus,
          isDeleted: false,
          // Stock kept in Italy isn't shippable, so it's normally excluded from "available to
          // release" checks. But when this classification's own grade is flagged remains-in-Italy,
          // its backing stock was written as REMAINS_IN_ITALY (see
          // HarvestAllocationService.processAllocationsForClassification) and must be included, or
          // the check always sees 0 available and blocks legitimate quantity reductions.
          ...(isRemainsInItaly ? {} : { type: { not: MovementType.REMAINS_IN_ITALY } }),
        },
        _sum: { quantity: true },
      });
      const available = result._sum.quantity ?? 0;
      if (available < releasedQuantity) {
        throw new BadRequestException(
          `${contextLabel}: insufficient unshipped trader stock. Required=${releasedQuantity}, available=${available}`,
        );
      }
    }
  }

  async permanentDeleteClassification(classificationId: number, actorId: number) {
    const record = await this.prisma.classification.findFirst({
      where: { id: classificationId, isDeleted: true },
    });
    if (!record) {
      throw new NotFoundException(`Deleted classification ${classificationId} not found`);
    }
    const deleted = await this.prisma.classification.delete({ where: { id: classificationId } });

    await this.auditLog.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Classification',
      entityId: classificationId,
      before: record,
    });

    return deleted;
  }

  private async assertInventoryAvailableForDeletion(
    tx: Prisma.TransactionClient,
    classification: {
      assignmentType: string;
      traderId: number | null;
      traderCategoryId: number | null;
      grade: string | null;
      pitamStatus: string | null;
      customerId: number | null;
      customerCategoryId: number | null;
      quantity: number;
      seasonId: number;
    },
    remainsInItalyGradeH: boolean,
    remainsInItalyGradeV: boolean,
  ) {
    await this.assertInventoryCanRelease(
      tx,
      classification,
      classification.quantity,
      'Delete classification',
      remainsInItalyGradeH,
      remainsInItalyGradeV,
    );
  }
}
