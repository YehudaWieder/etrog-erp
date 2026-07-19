import { BadRequestException, Injectable } from '@nestjs/common';
import { Grade, MovementType, PitamStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SeasonsService } from 'src/seasons/seasons.service';
import { InventoryAvailabilityService } from '../inventory-availability.service';
import { distributeQuantityByTraderSharesCapped } from '../validation/trader-share-distribution';
import { ResolvePitamSplitDto } from './dto/resolve-pitam-split.dto';

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

    if (!dto.traderCategoryId || !dto.grade) {
      throw new BadRequestException('traderCategoryId and grade are required');
    }

    return this.prisma.$transaction(async (tx) => {
      switch (dto.source) {
        case 'SPECIFIC_TRADER': {
          if (!dto.traderId) {
            throw new BadRequestException('traderId is required when source=SPECIFIC_TRADER');
          }
          return this.createTraderStockSplitTriple(tx, {
            seasonId,
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
  }

  // Case (א)/(ב) from the plan: a single party (one trader, or the modulo pool itself) resolving
  // its own MIXED balance. Never distributes to anyone else.
  private async createTraderStockSplitTriple(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: number;
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
            MovementReferenceId: negative.id,
            notes: params.notes,
            updatedById: params.updatedById,
          },
        }),
      );
    }

    return created;
  }

  // Case (ג) from the plan: "general" split by trader share percent. It deducts each trader's own
  // MIXED stock directly, proportional to TraderCategoryShare.percent, capped by what each trader
  // actually has. Any remainder that can't be absorbed by the traders themselves (all exhausted)
  // falls back to the modulo pool — same fallback behavior as ordinary general packing/sorting.
  private async resolveGeneralSplit(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: number;
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
      .map((s) => ({ traderId: s.traderId, percent: Number(s.percent) }))
      .filter((s) => s.percent > 0);

    if (positiveShares.length === 0) {
      throw new BadRequestException('All configured trader shares are zero or negative for this category');
    }

    const availabilityRows = await this.inventoryAvailabilityService.getTraderUnshippedAvailabilityByCategory(tx, {
      seasonId: params.seasonId,
      traderCategoryId: params.traderCategoryId,
      grade: params.grade,
      pitamStatus: PitamStatus.MIXED,
    });
    const availability = new Map(availabilityRows.map((r) => [r.traderId, r.available]));

    const { traderDeductions, moduloDeduction } = distributeQuantityByTraderSharesCapped({
      quantity: totalQty,
      shares: positiveShares,
      availability,
    });

    const results: Prisma.PromiseReturnType<typeof tx.traderStock.create>[] = [];
    for (const { traderId, quantity } of traderDeductions) {
      const traderWithQty = totalQty === 0 ? 0 : Math.floor((quantity * params.withQty) / totalQty);
      const traderWithoutQty = quantity - traderWithQty;

      const rows = await this.createTraderStockSplitTriple(tx, {
        seasonId: params.seasonId,
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

    // Remainder that no trader could absorb (all exhausted) falls back to modulo — if modulo itself
    // doesn't hold enough MIXED stock either, createTraderStockSplitTriple's availability check below
    // throws a clear insufficient-stock error rather than silently failing.
    if (moduloDeduction > 0) {
      const moduloWithQty = totalQty === 0 ? 0 : Math.floor((moduloDeduction * params.withQty) / totalQty);
      const moduloWithoutQty = moduloDeduction - moduloWithQty;

      const rows = await this.createTraderStockSplitTriple(tx, {
        seasonId: params.seasonId,
        traderId: null,
        isModulo: true,
        traderCategoryId: params.traderCategoryId,
        grade: params.grade,
        withQty: moduloWithQty,
        withoutQty: moduloWithoutQty,
        date: params.date,
        notes: params.notes,
        updatedById: params.updatedById,
      });
      results.push(...rows);
    }

    return results;
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
