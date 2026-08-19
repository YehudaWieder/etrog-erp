import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Grade, MovementType, PitamStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SeasonsService } from 'src/seasons/seasons.service';
import { InventoryAvailabilityService } from '../inventory-availability.service';
import { GeneralShareAllocationService } from '../general-share-allocation/general-share-allocation.service';
import { calculateExactShareQuantity, calculateMinimalGrossByShares } from '../validation/share-math';
import { ResolvePitamSplitDto } from './dto/resolve-pitam-split.dto';
import { groupPitamSplitRowsIntoBatches } from './utils/pitam-split-batch.util';

// Resolves part of a MIXED pitam balance into WITH_PITAM/WITHOUT_PITAM as new ledger movements
// (type=PITAM_SPLIT), without ever touching the originating Classification (sorting) record —
// see the Context section of the approved plan for why: retroactively changing Classification would
// corrupt the historical trader distribution that was already computed from it.
@Injectable()
export class PitamSplitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonsService: SeasonsService,
    private readonly inventoryAvailabilityService: InventoryAvailabilityService,
    private readonly generalShareAllocationService: GeneralShareAllocationService,
  ) {}

  async resolve(dto: ResolvePitamSplitDto, actorId: number) {
    const batchId = randomUUID();

    const movements = await this.prisma.$transaction(async (tx) => this.resolveInTx(tx, dto, batchId, actorId));

    return { batchId, movements };
  }

  // Replaces an existing batch with a new resolution in one transaction: deletes every row of
  // batchId (after the same "not yet consumed downstream" check undoBatch performs), then creates
  // a fresh batch from dto. If dto is invalid the whole transaction rolls back and the original
  // batch is left untouched.
  async updateBatch(batchId: string, dto: ResolvePitamSplitDto, actorId: number) {
    const newBatchId = randomUUID();

    const movements = await this.prisma.$transaction(async (tx) => {
      await this.deleteBatchInTx(tx, batchId);
      return this.resolveInTx(tx, dto, newBatchId, actorId);
    });

    return { batchId: newBatchId, previousBatchId: batchId, movements };
  }

  private async resolveInTx(
    tx: Prisma.TransactionClient,
    dto: ResolvePitamSplitDto,
    batchId: string,
    actorId: number,
  ) {
    this.validateQuantities(dto.withQty, dto.withoutQty);
    const { id: seasonId } = await this.seasonsService.findActiveSeason();
    const date = dto.date ? new Date(dto.date) : new Date();

    if (!dto.traderCategoryId || !dto.grade) {
      throw new BadRequestException('Trader category and grade must be selected.');
    }

    switch (dto.source) {
      case 'SPECIFIC_TRADER': {
        if (!dto.traderId) {
          throw new BadRequestException('A trader must be selected when the source is "specific trader".');
        }
        return this.createTraderStockSplitTriple(tx, {
          seasonId,
          batchId,
          traderId: dto.traderId,
          isModulo: false,
          traderCategoryId: dto.traderCategoryId,
          grade: dto.grade,
          withQty: dto.withQty,
          withoutQty: dto.withoutQty,
          date,
          notes: dto.notes,
          updatedById: actorId,
        });
      }
      case 'MODULO': {
        return this.createTraderStockSplitTriple(tx, {
          seasonId,
          batchId,
          traderId: null,
          isModulo: true,
          traderCategoryId: dto.traderCategoryId,
          grade: dto.grade,
          withQty: dto.withQty,
          withoutQty: dto.withoutQty,
          date,
          notes: dto.notes,
          updatedById: actorId,
        });
      }
      case 'GENERAL': {
        return this.resolveGeneralSplit(tx, {
          seasonId,
          batchId,
          traderCategoryId: dto.traderCategoryId,
          grade: dto.grade,
          withQty: dto.withQty,
          withoutQty: dto.withoutQty,
          date,
          notes: dto.notes,
          updatedById: actorId,
        });
      }
      default:
        throw new BadRequestException('A source must be selected: specific trader, modulo, or general.');
    }
  }

  async listBatches(query: { seasonId?: number; traderCategoryId?: number; grade?: Grade }) {
    const seasonId = query.seasonId ?? (await this.seasonsService.findActiveSeason()).id;

    const rows = await this.prisma.traderStock.findMany({
      where: {
        seasonId,
        type: MovementType.PITAM_SPLIT,
        pitamSplitBatchId: { not: null },
        ...(query.traderCategoryId ? { traderCategoryId: query.traderCategoryId } : {}),
        ...(query.grade ? { grade: query.grade } : {}),
      },
      include: { trader: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });

    const summaries = groupPitamSplitRowsIntoBatches(rows);

    return Promise.all(
      summaries.map(async ({ positiveRows, ...summary }) => {
        // SPECIFIC_TRADER/MODULO: a single party, so each row's own availability sums directly to
        // what's still safely cancellable. GENERAL: multiple parties fanned out - partial cancel
        // isn't safe there, so it's 0-or-full (every row must still have its full quantity available).
        if (summary.source === 'GENERAL') {
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
          return { ...summary, availableQuantity: allFullyAvailable ? summary.withQty + summary.withoutQty : 0 };
        }

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
        return { ...summary, availableQuantity: availabilities.reduce((sum, value) => sum + value, 0) };
      }),
    );
  }

  async undoBatch(batchId: string) {
    return this.prisma.$transaction(async (tx) => this.deleteBatchInTx(tx, batchId));
  }

  // All-or-nothing for every source (SPECIFIC_TRADER/MODULO/GENERAL): cancellation is only allowed
  // while every positive row the batch created is still fully unshipped - no partial cancel.
  private async deleteBatchInTx(tx: Prisma.TransactionClient, batchId: string) {
    const rows = await tx.traderStock.findMany({
      where: { pitamSplitBatchId: batchId, type: MovementType.PITAM_SPLIT },
    });

    if (rows.length === 0) {
      throw new NotFoundException(`Requested pitam split batch (${batchId}) not found.`);
    }

    const { seasonId } = rows[0];
    const positiveRows = rows.filter((row) => row.quantity > 0);
    const fullQuantity = positiveRows.reduce((sum, row) => sum + row.quantity, 0);

    for (const row of positiveRows) {
      await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(tx, {
        seasonId,
        traderId: row.traderId,
        traderCategoryId: row.traderCategoryId,
        grade: row.grade,
        pitamStatus: row.pitamStatus,
        isModulo: row.isModulo,
        requiredQuantity: row.quantity,
        contextLabel: 'Undo pitam split',
      });
    }

    await tx.traderStock.deleteMany({ where: { pitamSplitBatchId: batchId } });
    return { batchId, deletedCount: rows.length, reducedQuantity: fullQuantity };
  }

  // Case (א)/(ב) from the plan: a single party (one trader, or the modulo pool itself) resolving
  // its own MIXED balance. Never distributes to anyone else.
  private async createTraderStockSplitTriple(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: number;
      batchId: string;
      traderId: number | null;
      isModulo: boolean;
      traderCategoryId: number;
      grade: Grade;
      withQty: number;
      withoutQty: number;
      date: Date;
      notes?: string;
      updatedById: number;
    },
  ) {
    const totalQty = params.withQty + params.withoutQty;
    if (totalQty <= 0) {
      return [];
    }

    await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(tx, {
      seasonId: params.seasonId,
      traderId: params.traderId,
      traderCategoryId: params.traderCategoryId,
      grade: params.grade,
      pitamStatus: PitamStatus.MIXED,
      isModulo: params.isModulo,
      requiredQuantity: totalQty,
      contextLabel: 'Pitam split resolution',
    });

    const negative = await tx.traderStock.create({
      data: {
        seasonId: params.seasonId,
        date: params.date,
        traderId: params.traderId,
        traderCategoryId: params.traderCategoryId,
        grade: params.grade,
        pitamStatus: PitamStatus.MIXED,
        quantity: -totalQty,
        isModulo: params.isModulo,
        type: MovementType.PITAM_SPLIT,
        pitamSplitBatchId: params.batchId,
        notes: params.notes,
        updatedById: params.updatedById,
      },
    });

    const created = [negative];

    if (params.withQty > 0) {
      created.push(
        await tx.traderStock.create({
          data: {
            seasonId: params.seasonId,
            date: params.date,
            traderId: params.traderId,
            traderCategoryId: params.traderCategoryId,
            grade: params.grade,
            pitamStatus: PitamStatus.WITH_PITAM,
            quantity: params.withQty,
            isModulo: params.isModulo,
            type: MovementType.PITAM_SPLIT,
            pitamSplitBatchId: params.batchId,
            MovementReferenceId: negative.id,
            notes: params.notes,
            updatedById: params.updatedById,
          },
        }),
      );
    }

    if (params.withoutQty > 0) {
      created.push(
        await tx.traderStock.create({
          data: {
            seasonId: params.seasonId,
            date: params.date,
            traderId: params.traderId,
            traderCategoryId: params.traderCategoryId,
            grade: params.grade,
            pitamStatus: PitamStatus.WITHOUT_PITAM,
            quantity: params.withoutQty,
            isModulo: params.isModulo,
            type: MovementType.PITAM_SPLIT,
            pitamSplitBatchId: params.batchId,
            MovementReferenceId: negative.id,
            notes: params.notes,
            updatedById: params.updatedById,
          },
        }),
      );
    }

    if (params.isModulo) {
      for (const pitamStatus of [
        ...(params.withQty > 0 ? [PitamStatus.WITH_PITAM] : []),
        ...(params.withoutQty > 0 ? [PitamStatus.WITHOUT_PITAM] : []),
      ]) {
        await this.generalShareAllocationService.tryAssignFromModuloPool(tx, {
          seasonId: params.seasonId,
          date: params.date,
          traderCategoryId: params.traderCategoryId,
          grade: params.grade,
          pitamStatus,
          updatedById: params.updatedById,
          notes: params.notes,
        });
      }
    }

    return created;
  }

  // Case (ג) from the plan: "general" split by trader share percent. Unlike ordinary general
  // packing/sorting, this does NOT dump a rounding remainder onto whichever trader has the highest
  // share — that produced unfair results for small quantities (e.g. splitting 1 unit took the whole
  // thing from a single trader). Instead:
  //   1. Find the largest amount that CAN be split exactly and positively across every trader by their
  //      configured share (no trader gets 0, no leftover unit dumped on one trader) — and that every
  //      trader actually holds enough MIXED stock to cover. This is always a multiple of the smallest
  //      "fair step" for these shares (e.g. 50/50 shares → steps of 2), and may be less than the full
  //      requested quantity if some trader doesn't have enough for a bigger fair split.
  //   2. Whatever's left over (didn't fit into a fair multiple, or a trader was short) is taken from
  //      modulo — so trader shares stay fair while the odd/uncovered remainder is still resolved.
  //   3. If modulo can't cover that remainder either, fail with a clear message.
  private async resolveGeneralSplit(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: number;
      batchId: string;
      traderCategoryId: number;
      grade: Grade;
      withQty: number;
      withoutQty: number;
      date: Date;
      notes?: string;
      updatedById: number;
    },
  ) {
    const totalQty = params.withQty + params.withoutQty;

    const shares = await tx.traderCategoryShare.findMany({
      where: { seasonId: params.seasonId, traderCategoryId: params.traderCategoryId },
      select: { traderId: true, percent: true },
      orderBy: { traderId: 'asc' },
    });

    if (shares.length === 0) {
      throw new BadRequestException('No percentage split between traders is defined for this category in the current season.');
    }

    const positiveShares = shares
      .map((s) => ({ traderId: s.traderId, percentText: s.percent.toString() }))
      .filter((s) => Number(s.percentText) > 0);

    if (positiveShares.length === 0) {
      throw new BadRequestException('All percentages defined for traders in this category are zero or negative.');
    }

    const percentTexts = positiveShares.map((s) => s.percentText);
    const fairStep = calculateMinimalGrossByShares(1, percentTexts);

    const availabilityRows = await this.inventoryAvailabilityService.getTraderUnshippedAvailabilityByCategory(tx, {
      seasonId: params.seasonId,
      traderCategoryId: params.traderCategoryId,
      grade: params.grade,
      pitamStatus: PitamStatus.MIXED,
    });
    const availability = new Map(availabilityRows.map((r) => [r.traderId, r.available]));

    // Try the largest fair multiple ≤ totalQty first; if some trader can't cover their exact share of
    // it, step down to the next smaller fair multiple, down to 0 (everything falls to modulo).
    let traderPortion = Math.floor(totalQty / fairStep) * fairStep;
    let traderAllocations: Array<{ traderId: number; quantity: number }> = [];
    while (traderPortion > 0) {
      const candidate = positiveShares.map((share) => ({
        traderId: share.traderId,
        quantity: calculateExactShareQuantity(traderPortion, share.percentText),
      }));
      const everyoneHasEnough = candidate.every((a) => (availability.get(a.traderId) ?? 0) >= a.quantity);
      if (everyoneHasEnough) {
        traderAllocations = candidate;
        break;
      }
      traderPortion -= fairStep;
    }

    const moduloRemainder = totalQty - traderPortion;

    if (moduloRemainder > 0) {
      const moduloAvailable = await this.inventoryAvailabilityService.getTraderUnshippedBalance(tx, {
        seasonId: params.seasonId,
        traderId: null,
        traderCategoryId: params.traderCategoryId,
        grade: params.grade,
        pitamStatus: PitamStatus.MIXED,
        isModulo: true,
      });

      if (moduloAvailable < moduloRemainder) {
        throw new BadRequestException(
          traderPortion > 0
            ? `Cannot classify ${totalQty} units as "general": only ${traderPortion} units can be fairly split between traders (based on each trader's actual balance), ` +
              `and the remaining ${moduloRemainder} were expected to come from modulo — but modulo only has ${moduloAvailable} mixed units. ` +
              `You can request a smaller quantity, or classify the difference from a specific source (trader/modulo).`
            : `Cannot classify ${totalQty} units as "general": the quantity does not split fairly between traders (a multiple of ${fairStep} is required), ` +
              `and modulo only has ${moduloAvailable} out of the ${moduloRemainder} needed. ` +
              `You can request a multiple of ${fairStep} units for a fair split, or classify from a specific source (trader/modulo).`,
        );
      }
    }

    // Splitting each party's (trader/modulo) allocated quantity into with/without independently via
    // plain floor() loses units whenever a party's share is small relative to totalQty — e.g. 1 unit
    // requested as WITH_PITAM out of 3 total, spread across 3 parties, floors to 0 everywhere and the
    // WITH_PITAM unit vanishes into WITHOUT_PITAM. Distribute the two statuses across all parties
    // together instead, so the totals always add up to exactly params.withQty/params.withoutQty.
    const parties: Array<{ traderId: number | null; isModulo: boolean; quantity: number }> = [
      ...traderAllocations.map((a) => ({ traderId: a.traderId, isModulo: false, quantity: a.quantity })),
      ...(moduloRemainder > 0 ? [{ traderId: null, isModulo: true, quantity: moduloRemainder }] : []),
    ];
    const withQtyByParty = this.distributeAcrossParties(
      parties.map((p) => p.quantity),
      params.withQty,
    );

    const results: Prisma.PromiseReturnType<typeof tx.traderStock.create>[] = [];

    for (let i = 0; i < parties.length; i++) {
      const party = parties[i];
      const partyWithQty = withQtyByParty[i];
      const partyWithoutQty = party.quantity - partyWithQty;

      const rows = await this.createTraderStockSplitTriple(tx, {
        seasonId: params.seasonId,
        batchId: params.batchId,
        traderId: party.traderId,
        isModulo: party.isModulo,
        traderCategoryId: params.traderCategoryId,
        grade: params.grade,
        withQty: partyWithQty,
        withoutQty: partyWithoutQty,
        date: params.date,
        notes: params.notes,
        updatedById: params.updatedById,
      });
      results.push(...rows);
    }

    return results;
  }

  // Largest-remainder apportionment: distributes `total` across parties proportional to their
  // `quantities`, guaranteeing the results sum to exactly `total` (never losing units to independent
  // rounding) and never assigning a party more than its own quantity.
  private distributeAcrossParties(quantities: number[], total: number): number[] {
    const grandTotal = quantities.reduce((sum, q) => sum + q, 0);
    if (grandTotal === 0 || total <= 0) {
      return quantities.map(() => 0);
    }

    const raw = quantities.map((q) => (q * total) / grandTotal);
    const floors = raw.map(Math.floor);
    let remainder = total - floors.reduce((sum, f) => sum + f, 0);

    const order = raw
      .map((value, index) => ({ index, fraction: value - floors[index] }))
      .sort((a, b) => b.fraction - a.fraction);

    const result = [...floors];
    for (const { index } of order) {
      if (remainder <= 0) break;
      if (result[index] < quantities[index]) {
        result[index] += 1;
        remainder -= 1;
      }
    }

    return result;
  }

  private validateQuantities(withQty: number, withoutQty: number) {
    if (!Number.isInteger(withQty) || !Number.isInteger(withoutQty) || withQty < 0 || withoutQty < 0) {
      throw new BadRequestException('The "with pitam" and "without pitam" quantities must be positive integers.');
    }
    if (withQty + withoutQty <= 0) {
      throw new BadRequestException('The sum of the "with pitam" and "without pitam" quantities must be greater than zero.');
    }
  }
}
