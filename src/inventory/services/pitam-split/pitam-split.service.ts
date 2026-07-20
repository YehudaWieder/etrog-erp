import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Grade, MovementType, PitamStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SeasonsService } from 'src/seasons/seasons.service';
import { InventoryAvailabilityService } from '../inventory-availability.service';
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
  ) {}

  async resolve(dto: ResolvePitamSplitDto, actorId: number) {
    this.validateQuantities(dto.withQty, dto.withoutQty);
    const { id: seasonId } = await this.seasonsService.findActiveSeason();
    const date = dto.date ? new Date(dto.date) : new Date();
    const batchId = randomUUID();

    if (!dto.traderCategoryId || !dto.grade) {
      throw new BadRequestException('traderCategoryId and grade are required');
    }

    const movements = await this.prisma.$transaction(async (tx) => {
      switch (dto.source) {
        case 'SPECIFIC_TRADER': {
          if (!dto.traderId) {
            throw new BadRequestException('traderId is required when source=SPECIFIC_TRADER');
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
          throw new BadRequestException('source must be one of SPECIFIC_TRADER, MODULO, GENERAL');
      }
    });

    return { batchId, movements };
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

    return groupPitamSplitRowsIntoBatches(rows);
  }

  async undoBatch(batchId: string) {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.traderStock.findMany({
        where: { pitamSplitBatchId: batchId, type: MovementType.PITAM_SPLIT },
      });

      if (rows.length === 0) {
        throw new NotFoundException(`Pitam split batch ${batchId} not found`);
      }

      const { seasonId } = rows[0];

      // Undoing removes the positive WITH_PITAM/WITHOUT_PITAM rows this batch created — assert
      // that quantity hasn't since been consumed downstream (e.g. packed into a shipment), or the
      // ledger would be left short.
      const positiveRows = rows.filter((row) => row.quantity > 0);
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

      return { batchId, deletedCount: rows.length };
    });
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

    return created;
  }

  // Case (ג) from the plan: "general" split by trader share percent. Unlike ordinary general
  // packing/sorting, this does NOT dump a rounding remainder onto whichever trader has the highest
  // share — that produced unfair results for small quantities (e.g. splitting 1 unit took the whole
  // thing from a single trader). Instead:
  //   1. Try to split the total *exactly* and *positively* across every trader by their configured
  //      share (no trader gets 0, no leftover unit dumped on one trader) — and only accept that split
  //      if every trader actually holds enough MIXED stock to cover their exact share.
  //   2. If that's not possible (doesn't divide evenly, or some trader lacks enough stock), the
  //      *entire* quantity is taken from modulo instead (not a partial trader/modulo mix).
  //   3. If modulo doesn't have enough either, fail with the minimum quantity that *would* divide
  //      fairly, so the user can either request that amount or resolve from a specific trader/modulo.
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
      throw new BadRequestException('No trader shares defined for this category in the current season');
    }

    const positiveShares = shares
      .map((s) => ({ traderId: s.traderId, percentText: s.percent.toString() }))
      .filter((s) => Number(s.percentText) > 0);

    if (positiveShares.length === 0) {
      throw new BadRequestException('All configured trader shares are zero or negative for this category');
    }

    const exactAllocations = this.tryExactShareAllocations(totalQty, positiveShares);

    if (exactAllocations) {
      const availabilityRows = await this.inventoryAvailabilityService.getTraderUnshippedAvailabilityByCategory(tx, {
        seasonId: params.seasonId,
        traderCategoryId: params.traderCategoryId,
        grade: params.grade,
        pitamStatus: PitamStatus.MIXED,
      });
      const availability = new Map(availabilityRows.map((r) => [r.traderId, r.available]));

      const everyoneHasEnough = exactAllocations.every(
        (allocation) => (availability.get(allocation.traderId) ?? 0) >= allocation.quantity,
      );

      if (everyoneHasEnough) {
        const results: Prisma.PromiseReturnType<typeof tx.traderStock.create>[] = [];
        for (const { traderId, quantity } of exactAllocations) {
          const traderWithQty = totalQty === 0 ? 0 : Math.floor((quantity * params.withQty) / totalQty);
          const traderWithoutQty = quantity - traderWithQty;

          const rows = await this.createTraderStockSplitTriple(tx, {
            seasonId: params.seasonId,
            batchId: params.batchId,
            traderId,
            isModulo: false,
            traderCategoryId: params.traderCategoryId,
            grade: params.grade,
            withQty: traderWithQty,
            withoutQty: traderWithoutQty,
            date: params.date,
            notes: params.notes,
            updatedById: params.updatedById,
          });
          results.push(...rows);
        }
        return results;
      }
    }

    // Can't fairly split across every trader — take the entire quantity from modulo instead.
    const moduloAvailable = await this.inventoryAvailabilityService.getTraderUnshippedBalance(tx, {
      seasonId: params.seasonId,
      traderId: null,
      traderCategoryId: params.traderCategoryId,
      grade: params.grade,
      pitamStatus: PitamStatus.MIXED,
      isModulo: true,
    });

    if (moduloAvailable >= totalQty) {
      return this.createTraderStockSplitTriple(tx, {
        seasonId: params.seasonId,
        batchId: params.batchId,
        traderId: null,
        isModulo: true,
        traderCategoryId: params.traderCategoryId,
        grade: params.grade,
        withQty: params.withQty,
        withoutQty: params.withoutQty,
        date: params.date,
        notes: params.notes,
        updatedById: params.updatedById,
      });
    }

    const minimalFairQuantity = calculateMinimalGrossByShares(
      1,
      positiveShares.map((s) => s.percentText),
    );
    throw new BadRequestException(
      `Cannot resolve ${totalQty} unit(s) as GENERAL: they can't be split fairly across all traders (each must receive an equal whole share), and the modulo pool doesn't hold enough MIXED stock to cover the full amount either. ` +
        `Request a multiple of ${minimalFairQuantity} unit(s) for a fair general split, or resolve from a specific trader or modulo instead.`,
    );
  }

  // Returns each trader's exact, positive, whole-number share of totalQty — or null if the amount
  // can't be split that way (doesn't divide evenly for some trader, or would give someone 0).
  private tryExactShareAllocations(
    totalQty: number,
    shares: Array<{ traderId: number; percentText: string }>,
  ): Array<{ traderId: number; quantity: number }> | null {
    if (totalQty <= 0) {
      return null;
    }

    const allocations: Array<{ traderId: number; quantity: number }> = [];
    for (const share of shares) {
      try {
        const quantity = calculateExactShareQuantity(totalQty, share.percentText);
        if (quantity <= 0) {
          return null;
        }
        allocations.push({ traderId: share.traderId, quantity });
      } catch {
        return null;
      }
    }

    return allocations;
  }

  private validateQuantities(withQty: number, withoutQty: number) {
    if (!Number.isInteger(withQty) || !Number.isInteger(withoutQty) || withQty < 0 || withoutQty < 0) {
      throw new BadRequestException('withQty and withoutQty must be non-negative integers');
    }
    if (withQty + withoutQty <= 0) {
      throw new BadRequestException('withQty + withoutQty must be greater than zero');
    }
  }
}
