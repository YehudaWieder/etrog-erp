import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Grade, MovementType, PitamStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SeasonsService } from 'src/seasons/seasons.service';
import { InventoryAvailabilityService } from '../inventory-availability.service';
import { GeneralShareAllocationService } from '../general-share-allocation/general-share-allocation.service';
import {
  CreateRemainsInItalyWithdrawalDto,
  RemainsInItalyDestinationType,
} from './dto/create-remains-in-italy-withdrawal.dto';

@Injectable()
export class RemainsInItalyWithdrawalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonsService: SeasonsService,
    private readonly inventoryAvailabilityService: InventoryAvailabilityService,
    private readonly generalShareAllocationService: GeneralShareAllocationService,
  ) {}

  async create(dto: CreateRemainsInItalyWithdrawalDto, actorId: number) {
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    const negative = await this.prisma.$transaction(async (tx) => this.createInTx(tx, seasonId, dto, actorId));

    return { id: negative.id };
  }

  async listWithdrawals(query: {
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
        type: MovementType.REMAINS_IN_ITALY,
        quantity: { lt: 0 },
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

    const [traderRows, customerRows] = await Promise.all([
      this.prisma.traderStock.findMany({
        where: {
          MovementReferenceId: { in: anchorIds },
          isDeleted: false,
          type: { in: [MovementType.HARVEST_IN, MovementType.ASSIGNED] },
        },
        include: { trader: { select: { id: true, name: true } } },
      }),
      this.prisma.customerAllocation.findMany({
        where: {
          MovementReferenceId: { in: anchorIds },
          isDeleted: false,
          type: MovementType.HARVEST_IN,
        },
        include: { customer: { select: { id: true, customerName: true } } },
      }),
    ]);

    return Promise.all(
      anchors.map(async (anchor) => {
        const linkedTraderRows = traderRows.filter((row) => row.MovementReferenceId === anchor.id);
        const linkedCustomerRows = customerRows.filter((row) => row.MovementReferenceId === anchor.id);

        let destinationType: RemainsInItalyDestinationType;
        let traderId: number | null = null;
        let traderName: string | null = null;
        let customerId: number | null = null;
        let customerCategoryId: number | null = null;
        let customerName: string | null = null;

        if (linkedCustomerRows.length > 0) {
          destinationType = 'CUSTOMER';
          customerId = linkedCustomerRows[0].customerId;
          customerCategoryId = linkedCustomerRows[0].customerCategoryId;
          customerName = linkedCustomerRows[0].customer.customerName;
        } else if (linkedTraderRows.length === 1) {
          destinationType = 'TRADER';
          traderId = linkedTraderRows[0].traderId;
          traderName = linkedTraderRows[0].trader?.name ?? null;
        } else {
          destinationType = 'GENERAL';
        }

        const quantity = Math.abs(anchor.quantity);

        // TRADER/CUSTOMER destinations create exactly one positive row directly - a straightforward
        // reduce. GENERAL fans the destination across multiple trader rows via
        // generalShareAllocationService.allocateGeneralQuantity - partial cancel isn't safe there,
        // so it's 0-or-full like the other GENERAL cases.
        let availableQuantity: number;
        if (destinationType === 'TRADER') {
          availableQuantity = await this.inventoryAvailabilityService.getTraderAvailableToReduce(this.prisma, {
            seasonId: anchor.seasonId,
            traderId: linkedTraderRows[0].traderId,
            traderCategoryId: linkedTraderRows[0].traderCategoryId,
            grade: linkedTraderRows[0].grade,
            pitamStatus: linkedTraderRows[0].pitamStatus,
            isModulo: linkedTraderRows[0].isModulo,
            requestedQuantity: linkedTraderRows[0].quantity,
          });
        } else if (destinationType === 'CUSTOMER') {
          availableQuantity = await this.inventoryAvailabilityService.getCustomerAvailableToReduce(this.prisma, {
            seasonId: linkedCustomerRows[0].seasonId,
            customerId: linkedCustomerRows[0].customerId,
            customerCategoryId: linkedCustomerRows[0].customerCategoryId,
            pitamStatus: linkedCustomerRows[0].pitamStatus,
            requestedQuantity: linkedCustomerRows[0].quantity,
          });
        } else {
          const availabilities = await Promise.all(
            linkedTraderRows.map((row) =>
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
          const allFullyAvailable = linkedTraderRows.every((row, index) => availabilities[index] >= row.quantity);
          availableQuantity = allFullyAvailable ? quantity : 0;
        }

        return {
          id: anchor.id,
          seasonId: anchor.seasonId,
          date: anchor.date,
          traderCategoryId: anchor.traderCategoryId,
          grade: anchor.grade,
          pitamStatus: anchor.pitamStatus,
          quantity,
          availableQuantity,
          destinationType,
          traderId,
          traderName,
          customerId,
          customerCategoryId,
          customerName,
          notes: anchor.notes,
        };
      }),
    );
  }

  async undoWithdrawal(anchorId: number) {
    return this.prisma.$transaction(async (tx) => this.deleteWithdrawalInTx(tx, anchorId));
  }

  async updateWithdrawal(anchorId: number, dto: CreateRemainsInItalyWithdrawalDto, actorId: number) {
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    const negative = await this.prisma.$transaction(async (tx) => {
      await this.deleteWithdrawalInTx(tx, anchorId);
      return this.createInTx(tx, seasonId, dto, actorId);
    });

    return { id: negative.id, previousId: anchorId };
  }

  private async createInTx(
    tx: Prisma.TransactionClient,
    seasonId: number,
    dto: CreateRemainsInItalyWithdrawalDto,
    actorId: number,
  ) {
    this.validate(dto);
    const date = dto.date ? new Date(dto.date) : new Date();

    await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(tx, {
      seasonId,
      traderId: null,
      isModulo: false,
      traderCategoryId: dto.traderCategoryId,
      grade: dto.grade,
      pitamStatus: dto.pitamStatus,
      requiredQuantity: dto.quantity,
      contextLabel: 'Withdrawal from remains in Italy',
    });

    const negative = await tx.traderStock.create({
      data: {
        seasonId,
        date,
        traderId: null,
        traderCategoryId: dto.traderCategoryId,
        grade: dto.grade,
        pitamStatus: dto.pitamStatus,
        quantity: -dto.quantity,
        isModulo: false,
        type: MovementType.REMAINS_IN_ITALY,
        updatedById: actorId,
        notes: dto.notes,
      },
    });

    if (dto.destinationType === 'TRADER') {
      await tx.traderStock.create({
        data: {
          seasonId,
          date,
          traderId: dto.traderId!,
          traderCategoryId: dto.traderCategoryId,
          grade: dto.grade,
          pitamStatus: dto.pitamStatus,
          quantity: dto.quantity,
          isModulo: false,
          type: MovementType.HARVEST_IN,
          MovementReferenceId: negative.id,
          updatedById: actorId,
          notes: dto.notes,
        },
      });
    } else if (dto.destinationType === 'CUSTOMER') {
      await tx.customerAllocation.create({
        data: {
          seasonId,
          date,
          dateHebrew: date.toLocaleDateString('he-IL'),
          customerId: dto.customerId!,
          customerCategoryId: dto.customerCategoryId!,
          pitamStatus: dto.pitamStatus,
          quantity: dto.quantity,
          type: MovementType.HARVEST_IN,
          takenFrom: 'GENERAL',
          MovementReferenceId: negative.id,
          updatedById: actorId,
          notes: dto.notes,
        },
      });
    } else {
      await this.generalShareAllocationService.allocateGeneralQuantity(tx, {
        seasonId,
        date,
        traderCategoryId: dto.traderCategoryId,
        grade: dto.grade,
        pitamStatus: dto.pitamStatus,
        quantity: dto.quantity,
        movementReferenceId: negative.id,
        updatedById: actorId,
        notes: dto.notes,
      });
    }

    return negative;
  }

  // Shared by undoWithdrawal and updateWithdrawal (delete-then-recreate). Asserts every positive
  // (destination-side) row this withdrawal created hasn't since been consumed downstream (e.g.
  // packed into a shipment) before permanently deleting the anchor row and everything it created.
  // All-or-nothing for every destination type: cancellation is only allowed while the full
  // withdrawn quantity is still unshipped - no partial cancel.
  private async deleteWithdrawalInTx(tx: Prisma.TransactionClient, anchorId: number) {
    const anchor = await tx.traderStock.findFirst({
      where: { id: anchorId, type: MovementType.REMAINS_IN_ITALY, quantity: { lt: 0 }, isDeleted: false },
    });

    if (!anchor) {
      throw new NotFoundException(`Withdrawal from remains in Italy (${anchorId}) not found.`);
    }

    const [traderRows, customerRows] = await Promise.all([
      tx.traderStock.findMany({
        where: { MovementReferenceId: anchorId, type: { in: [MovementType.HARVEST_IN, MovementType.ASSIGNED] } },
      }),
      tx.customerAllocation.findMany({
        where: { MovementReferenceId: anchorId, type: MovementType.HARVEST_IN },
      }),
    ]);

    const destinationType: RemainsInItalyDestinationType =
      customerRows.length > 0 ? 'CUSTOMER' : traderRows.length === 1 ? 'TRADER' : 'GENERAL';
    const fullQuantity = Math.abs(anchor.quantity);

    if (destinationType === 'GENERAL') {
      for (const row of traderRows.filter((row) => row.quantity > 0)) {
        await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(tx, {
          seasonId: row.seasonId,
          traderId: row.traderId,
          traderCategoryId: row.traderCategoryId,
          grade: row.grade,
          pitamStatus: row.pitamStatus,
          isModulo: row.isModulo,
          requiredQuantity: row.quantity,
          contextLabel: 'Cancel withdrawal from remains in Italy',
        });
      }

      await tx.traderStock.deleteMany({ where: { id: anchorId } });
      if (traderRows.length > 0) {
        await tx.traderStock.deleteMany({ where: { MovementReferenceId: anchorId } });
      }

      return { anchorId, deletedCount: 1 + traderRows.length, reducedQuantity: fullQuantity };
    }

    if (destinationType === 'TRADER') {
      const row = traderRows[0];
      await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(tx, {
        seasonId: row.seasonId,
        traderId: row.traderId,
        traderCategoryId: row.traderCategoryId,
        grade: row.grade,
        pitamStatus: row.pitamStatus,
        isModulo: row.isModulo,
        requiredQuantity: fullQuantity,
        contextLabel: 'Cancel withdrawal from remains in Italy',
      });

      await tx.traderStock.deleteMany({ where: { id: anchorId } });
      await tx.traderStock.deleteMany({ where: { MovementReferenceId: anchorId } });
      return { anchorId, deletedCount: 2, reducedQuantity: fullQuantity };
    }

    // CUSTOMER
    const row = customerRows[0];
    await this.inventoryAvailabilityService.assertCustomerHasUnshippedStock(tx, {
      seasonId: row.seasonId,
      customerId: row.customerId,
      customerCategoryId: row.customerCategoryId,
      pitamStatus: row.pitamStatus,
      requiredQuantity: fullQuantity,
      contextLabel: 'Cancel withdrawal from remains in Italy',
    });

    await tx.traderStock.deleteMany({ where: { id: anchorId } });
    await tx.customerAllocation.deleteMany({ where: { MovementReferenceId: anchorId } });
    return { anchorId, deletedCount: 2, reducedQuantity: fullQuantity };
  }

  private validate(dto: CreateRemainsInItalyWithdrawalDto) {
    if (!dto.traderCategoryId || !dto.grade || !dto.pitamStatus || !dto.quantity || dto.quantity <= 0) {
      throw new BadRequestException(
        'traderCategoryId, grade, pitamStatus, and a positive quantity are required',
      );
    }

    if (dto.destinationType === 'TRADER' && !dto.traderId) {
      throw new BadRequestException('traderId is required when destinationType=TRADER');
    }

    if (dto.destinationType === 'CUSTOMER' && (!dto.customerId || !dto.customerCategoryId)) {
      throw new BadRequestException(
        'customerId and customerCategoryId are required when destinationType=CUSTOMER',
      );
    }

    if (!['TRADER', 'CUSTOMER', 'GENERAL'].includes(dto.destinationType)) {
      throw new BadRequestException('destinationType must be one of: TRADER, CUSTOMER, GENERAL');
    }
  }
}
