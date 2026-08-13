import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Grade, MovementType, PitamStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SeasonsService } from 'src/seasons/seasons.service';
import { InventoryAvailabilityService } from '../inventory-availability.service';
import { GeneralShareAllocationService } from '../general-share-allocation/general-share-allocation.service';
import { ReclassificationSource, ResolveReclassificationDto } from './dto/resolve-reclassification.dto';

type Tuple = { traderCategoryId: number; grade: Grade; pitamStatus: PitamStatus };

@Injectable()
export class ReclassificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonsService: SeasonsService,
    private readonly inventoryAvailabilityService: InventoryAvailabilityService,
    private readonly generalShareAllocationService: GeneralShareAllocationService,
  ) {}

  async resolve(dto: ResolveReclassificationDto, actorId: number) {
    const { id: seasonId } = await this.seasonsService.findActiveSeason();
    const anchor = await this.prisma.$transaction(async (tx) => this.createInTx(tx, seasonId, dto, actorId));
    return { id: anchor.id };
  }

  async listBatches(query: {
    seasonId?: number;
    traderCategoryId?: number;
    grade?: Grade;
    pitamStatus?: PitamStatus;
  }) {
    const seasonId = query.seasonId ?? (await this.seasonsService.findActiveSeason()).id;

    const anchors = await this.prisma.traderStock.findMany({
      where: {
        seasonId,
        isDeleted: false,
        type: MovementType.RECLASSIFICATION,
        quantity: { lt: 0 },
        MovementReferenceId: null,
        ...(query.traderCategoryId ? { traderCategoryId: query.traderCategoryId } : {}),
        ...(query.grade ? { grade: query.grade } : {}),
        ...(query.pitamStatus ? { pitamStatus: query.pitamStatus } : {}),
      },
      orderBy: { date: 'desc' },
    });

    if (anchors.length === 0) {
      return [];
    }

    const anchorIds = anchors.map((anchor) => anchor.id);
    const linkedRows = await this.prisma.traderStock.findMany({
      where: { MovementReferenceId: { in: anchorIds }, isDeleted: false },
      include: { trader: { select: { id: true, name: true } } },
    });

    return Promise.all(
      anchors.map(async (anchor) => {
        const linked = linkedRows.filter((row) => row.MovementReferenceId === anchor.id);
        const allRows = [{ ...anchor, trader: null as { id: number; name: string } | null }, ...linked];

        const matchesFromTuple = (row: (typeof allRows)[number]) =>
          row.traderCategoryId === anchor.traderCategoryId &&
          row.grade === anchor.grade &&
          row.pitamStatus === anchor.pitamStatus;

        const quantity = Math.abs(
          allRows.filter(matchesFromTuple).reduce((sum, row) => sum + row.quantity, 0),
        );

        const toRow = allRows.find((row) => !matchesFromTuple(row));

        const source = this.inferSource(anchor, linked);
        const traderId = source === 'SPECIFIC_TRADER' ? anchor.traderId : null;
        const traderName = source === 'SPECIFIC_TRADER' ? (linked.find((r) => r.traderId === traderId)?.trader?.name ?? null) : null;

        // GENERAL and REMAINS_IN_ITALY sources fan the "to" side out across multiple linked rows
        // (one per trader/modulo share) via generalShareAllocationService.allocateGeneralQuantity,
        // so partial-cancel isn't safe there - availableQuantity is 0-or-full: every positive row
        // must still have its own full quantity available, otherwise the whole batch is blocked,
        // mirroring what deleteBatchInTx's per-row assert would currently allow.
        const positiveRows = linked.filter((row) => row.quantity > 0);
        const availableQuantity =
          source === 'SPECIFIC_TRADER'
            ? await this.inventoryAvailabilityService.getTraderAvailableToReduce(this.prisma, {
                seasonId: anchor.seasonId,
                traderId: positiveRows[0]?.traderId ?? null,
                traderCategoryId: positiveRows[0]?.traderCategoryId ?? anchor.traderCategoryId,
                grade: positiveRows[0]?.grade ?? anchor.grade,
                pitamStatus: positiveRows[0]?.pitamStatus ?? anchor.pitamStatus,
                isModulo: positiveRows[0]?.isModulo ?? false,
                requestedQuantity: positiveRows[0]?.quantity ?? 0,
              })
            : await (async () => {
                const availabilities = await Promise.all(
                  positiveRows.map((row) =>
                    this.inventoryAvailabilityService.getTraderAvailableToReduce(this.prisma, {
                      seasonId: row.seasonId,
                      traderId: row.traderId,
                      traderCategoryId: row.traderCategoryId,
                      grade: row.grade,
                      pitamStatus: row.pitamStatus,
                      isModulo: row.isModulo,
                      requestedQuantity: row.quantity,
                    }),
                  ),
                );
                const allFullyAvailable = positiveRows.every((row, index) => availabilities[index] >= row.quantity);
                return allFullyAvailable ? quantity : 0;
              })();

        return {
          id: anchor.id,
          seasonId: anchor.seasonId,
          date: anchor.date,
          source,
          traderId,
          traderName,
          from: {
            traderCategoryId: anchor.traderCategoryId,
            grade: anchor.grade,
            pitamStatus: anchor.pitamStatus,
          },
          to: toRow
            ? { traderCategoryId: toRow.traderCategoryId, grade: toRow.grade, pitamStatus: toRow.pitamStatus }
            : null,
          quantity,
          availableQuantity,
          notes: anchor.notes,
        };
      }),
    );
  }

  async getReclassificationSummary(seasonId?: number) {
    const batches = await this.listBatches({ seasonId });

    const groups = new Map<string, { from: Tuple; to: Tuple; quantity: number }>();
    for (const batch of batches) {
      if (!batch.to) continue;
      const key = [
        batch.from.traderCategoryId,
        batch.from.grade,
        batch.from.pitamStatus,
        batch.to.traderCategoryId,
        batch.to.grade,
        batch.to.pitamStatus,
      ].join('|');

      const existing = groups.get(key);
      if (existing) {
        existing.quantity += batch.quantity;
      } else {
        groups.set(key, { from: batch.from, to: batch.to, quantity: batch.quantity });
      }
    }

    return Array.from(groups.values());
  }

  async undoBatch(anchorId: number, quantity?: number) {
    return this.prisma.$transaction(async (tx) => this.deleteBatchInTx(tx, anchorId, quantity));
  }

  async updateBatch(anchorId: number, dto: ResolveReclassificationDto, actorId: number) {
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    const anchor = await this.prisma.$transaction(async (tx) => {
      await this.deleteBatchInTx(tx, anchorId);
      return this.createInTx(tx, seasonId, dto, actorId);
    });

    return { id: anchor.id, previousId: anchorId };
  }

  private async createInTx(
    tx: Prisma.TransactionClient,
    seasonId: number,
    dto: ResolveReclassificationDto,
    actorId: number,
  ) {
    this.validate(dto);
    const date = dto.date ? new Date(dto.date) : new Date();

    const from: Tuple = {
      traderCategoryId: dto.fromTraderCategoryId,
      grade: dto.fromGrade,
      pitamStatus: dto.fromPitamStatus,
    };
    const to: Tuple = {
      traderCategoryId: dto.toTraderCategoryId,
      grade: dto.toGrade,
      pitamStatus: dto.toPitamStatus,
    };

    if (dto.source === 'SPECIFIC_TRADER') {
      // SPECIFIC_TRADER reclassifies only a trader's own private-selection stock - never their
      // share of the general pool, which must go through GENERAL so the rebalancing across other
      // traders' shares stays consistent. Both the deducted and re-landed rows are tagged
      // isFromPrivateSelection so the private-selection balance stays accurate afterward.
      await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(tx, {
        seasonId,
        traderId: dto.traderId!,
        traderCategoryId: from.traderCategoryId,
        grade: from.grade,
        pitamStatus: from.pitamStatus,
        isModulo: false,
        requiredQuantity: dto.quantity,
        onlyPrivateSelection: true,
        contextLabel: 'שינוי סיווג',
      });

      const negative = await tx.traderStock.create({
        data: {
          seasonId,
          date,
          traderId: dto.traderId!,
          traderCategoryId: from.traderCategoryId,
          grade: from.grade,
          pitamStatus: from.pitamStatus,
          quantity: -dto.quantity,
          isModulo: false,
          type: MovementType.RECLASSIFICATION,
          isFromPrivateSelection: true,
          updatedById: actorId,
          notes: dto.notes,
        },
      });

      await tx.traderStock.create({
        data: {
          seasonId,
          date,
          traderId: dto.traderId!,
          traderCategoryId: to.traderCategoryId,
          grade: to.grade,
          pitamStatus: to.pitamStatus,
          quantity: dto.quantity,
          isModulo: false,
          type: MovementType.RECLASSIFICATION,
          isFromPrivateSelection: true,
          MovementReferenceId: negative.id,
          updatedById: actorId,
          notes: dto.notes,
        },
      });

      return negative;
    }

    if (dto.source === 'REMAINS_IN_ITALY') {
      await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(tx, {
        seasonId,
        traderId: null,
        isModulo: false,
        traderCategoryId: from.traderCategoryId,
        grade: from.grade,
        pitamStatus: from.pitamStatus,
        requiredQuantity: dto.quantity,
        contextLabel: 'שינוי סיווג מנשאר באיטליה',
      });

      const negative = await tx.traderStock.create({
        data: {
          seasonId,
          date,
          traderId: null,
          traderCategoryId: from.traderCategoryId,
          grade: from.grade,
          pitamStatus: from.pitamStatus,
          quantity: -dto.quantity,
          isModulo: false,
          type: MovementType.RECLASSIFICATION,
          updatedById: actorId,
          notes: dto.notes,
        },
      });

      await this.generalShareAllocationService.allocateGeneralQuantity(tx, {
        seasonId,
        date,
        traderCategoryId: to.traderCategoryId,
        grade: to.grade,
        pitamStatus: to.pitamStatus,
        quantity: dto.quantity,
        type: MovementType.RECLASSIFICATION,
        movementReferenceId: negative.id,
        updatedById: actorId,
        notes: dto.notes,
      });

      return negative;
    }

    // GENERAL
    const { rows: negativeRows } = await this.generalShareAllocationService.deductGeneralQuantity(tx, {
      seasonId,
      date,
      traderCategoryId: from.traderCategoryId,
      grade: from.grade,
      pitamStatus: from.pitamStatus,
      quantity: dto.quantity,
      type: MovementType.RECLASSIFICATION,
      contextLabel: 'שינוי סיווג כללי',
      excludePrivateSelection: true,
      updatedById: actorId,
      notes: dto.notes,
    });

    const anchorId = negativeRows[0].id;
    if (negativeRows.length > 1) {
      await tx.traderStock.updateMany({
        where: { id: { in: negativeRows.map((row) => row.id) } },
        data: { MovementReferenceId: anchorId },
      });
    }

    if (dto.toRemainsInItaly) {
      await tx.traderStock.create({
        data: {
          seasonId,
          date,
          traderId: null,
          traderCategoryId: to.traderCategoryId,
          grade: to.grade,
          pitamStatus: to.pitamStatus,
          quantity: dto.quantity,
          isModulo: false,
          type: MovementType.RECLASSIFICATION,
          MovementReferenceId: anchorId,
          updatedById: actorId,
          notes: dto.notes,
        },
      });
    } else {
      await this.generalShareAllocationService.allocateGeneralQuantity(tx, {
        seasonId,
        date,
        traderCategoryId: to.traderCategoryId,
        grade: to.grade,
        pitamStatus: to.pitamStatus,
        quantity: dto.quantity,
        type: MovementType.RECLASSIFICATION,
        movementReferenceId: anchorId,
        updatedById: actorId,
        notes: dto.notes,
      });
    }

    return tx.traderStock.findUniqueOrThrow({ where: { id: anchorId } });
  }

  // Shared by undoBatch and updateBatch. Asserts every positive row the batch created hasn't
  // since been consumed downstream (e.g. packed into a shipment), then permanently deletes the
  // anchor row and everything linked to it via MovementReferenceId.
  private async deleteBatchInTx(tx: Prisma.TransactionClient, anchorId: number, quantity?: number) {
    const anchor = await tx.traderStock.findFirst({
      where: { id: anchorId, type: MovementType.RECLASSIFICATION, quantity: { lt: 0 }, isDeleted: false },
    });

    if (!anchor) {
      throw new NotFoundException(`שינוי סיווג (${anchorId}) לא נמצא.`);
    }

    const linked = await tx.traderStock.findMany({
      where: { MovementReferenceId: anchorId, isDeleted: false },
    });

    const source = this.inferSource(anchor, linked);
    const positiveRows = linked.filter((row) => row.quantity > 0);

    // GENERAL/REMAINS_IN_ITALY fan the "to" side across multiple linked rows - partial cancel
    // isn't safe there (no single row to decrement), so it stays all-or-nothing.
    if (source !== 'SPECIFIC_TRADER') {
      const fullQuantity = positiveRows.reduce((sum, row) => sum + row.quantity, 0);
      if (quantity !== undefined && quantity !== fullQuantity) {
        throw new BadRequestException('לא ניתן לבטל חלקית שינוי סיווג ממקור כללי/נשאר באיטליה - יש לבטל את כל הכמות.');
      }

      for (const row of positiveRows) {
        await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(tx, {
          seasonId: row.seasonId,
          traderId: row.traderId,
          traderCategoryId: row.traderCategoryId,
          grade: row.grade,
          pitamStatus: row.pitamStatus,
          isModulo: row.isModulo,
          requiredQuantity: row.quantity,
          contextLabel: 'ביטול שינוי סיווג',
        });
      }

      await tx.traderStock.deleteMany({ where: { id: anchorId } });
      if (linked.length > 0) {
        await tx.traderStock.deleteMany({ where: { MovementReferenceId: anchorId } });
      }

      return { anchorId, deletedCount: 1 + linked.length, reducedQuantity: fullQuantity };
    }

    // SPECIFIC_TRADER: single positive "to" row - safe to reduce in place for a partial cancel.
    const toRow = positiveRows[0];
    const fullQuantity = toRow?.quantity ?? 0;
    const reduceBy = quantity ?? fullQuantity;

    if (reduceBy <= 0 || reduceBy > fullQuantity) {
      throw new BadRequestException(`כמות לביטול לא תקינה: ${reduceBy} (זמין: ${fullQuantity})`);
    }

    await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(tx, {
      seasonId: toRow.seasonId,
      traderId: toRow.traderId,
      traderCategoryId: toRow.traderCategoryId,
      grade: toRow.grade,
      pitamStatus: toRow.pitamStatus,
      isModulo: toRow.isModulo,
      requiredQuantity: reduceBy,
      contextLabel: 'ביטול שינוי סיווג',
    });

    if (reduceBy === fullQuantity) {
      await tx.traderStock.deleteMany({ where: { id: anchorId } });
      await tx.traderStock.deleteMany({ where: { MovementReferenceId: anchorId } });
      return { anchorId, deletedCount: 1 + linked.length, reducedQuantity: reduceBy };
    }

    await tx.traderStock.update({ where: { id: toRow.id }, data: { quantity: toRow.quantity - reduceBy } });
    await tx.traderStock.update({ where: { id: anchor.id }, data: { quantity: anchor.quantity + reduceBy } });

    return { anchorId, deletedCount: 0, reducedQuantity: reduceBy };
  }

  private inferSource(
    anchor: { traderId: number | null; isModulo: boolean },
    linked: { traderId: number | null; isModulo: boolean; quantity: number }[],
  ): ReclassificationSource {
    if (anchor.traderId === null && !anchor.isModulo) {
      return 'REMAINS_IN_ITALY';
    }
    if (anchor.traderId === null && anchor.isModulo) {
      return 'GENERAL';
    }
    const negativeRowCount = 1 + linked.filter((row) => row.quantity < 0).length;
    return negativeRowCount > 1 ? 'GENERAL' : 'SPECIFIC_TRADER';
  }

  private validate(dto: ResolveReclassificationDto) {
    if (
      !dto.fromTraderCategoryId ||
      !dto.fromGrade ||
      !dto.fromPitamStatus ||
      !dto.toTraderCategoryId ||
      !dto.toGrade ||
      !dto.toPitamStatus ||
      !dto.quantity ||
      dto.quantity <= 0
    ) {
      throw new BadRequestException(
        'fromTraderCategoryId, fromGrade, fromPitamStatus, toTraderCategoryId, toGrade, toPitamStatus, and a positive quantity are required',
      );
    }

    if (
      dto.fromTraderCategoryId === dto.toTraderCategoryId &&
      dto.fromGrade === dto.toGrade &&
      dto.fromPitamStatus === dto.toPitamStatus
    ) {
      throw new BadRequestException('הסיווג החדש זהה לסיווג הישן - אין שינוי לבצע.');
    }

    if (!['SPECIFIC_TRADER', 'GENERAL', 'REMAINS_IN_ITALY'].includes(dto.source)) {
      throw new BadRequestException('source must be one of: SPECIFIC_TRADER, GENERAL, REMAINS_IN_ITALY');
    }

    if (dto.source === 'SPECIFIC_TRADER' && !dto.traderId) {
      throw new BadRequestException('traderId is required when source=SPECIFIC_TRADER');
    }
  }
}
