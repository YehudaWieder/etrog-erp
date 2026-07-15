import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Grade, MovementType, PitamStatus, Prisma, SourceType } from '@prisma/client';
import {
  InternalTransferRequestDto,
  InventoryOwnerType,
} from 'src/inventory/services/inventory-core/dto/internal-transfer.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SeasonsService } from 'src/seasons/seasons.service';
import { InventoryAvailabilityService } from '../inventory-availability.service';
import { InventoryValidationService } from '../validation/inventory-validation.service';

type TransferLedgerRecord =
  | { table: 'traderStock'; record: Prisma.TraderStockGetPayload<{}> }
  | { table: 'customerAllocation'; record: Prisma.CustomerAllocationGetPayload<{}> };

type TransferSideSpec = {
  pitamStatus: PitamStatus;
  traderCategoryId?: number;
  grade?: Grade;
  customerCategoryId?: number;
};

@Injectable()
export class InternalTransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonsService: SeasonsService,
    private readonly inventoryAvailabilityService: InventoryAvailabilityService,
    private readonly inventoryValidationService: InventoryValidationService,
  ) {}

  async create(data: InternalTransferRequestDto, actorId: number) {
    this.inventoryValidationService.validateInternalTransferDto(data);
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    return this.prisma.$transaction(async (tx) => {
      return this.createTransferPairTx(tx, seasonId, data, actorId);
    });
  }

  async update(
    operationId: number,
    data: InternalTransferRequestDto,
    actorId: number,
  ) {
    this.inventoryValidationService.validateInternalTransferDto(data);

    return this.prisma.$transaction(async (tx) => {
      const pair = await this.getTransferPairTx(tx, operationId);
      const { id: seasonId } = await this.seasonsService.findActiveSeason();
      await this.assertTransferCustomerCategoryOwnershipTx(tx, data);

      const expectedTables = this.getExpectedTables(data);
      const existingTables = [pair.negative.table, pair.positive.table]
        .sort()
        .join('|');

      if (expectedTables !== existingTables) {
        await this.softDeletePairTx(
          tx,
          pair.negative.record.id,
          pair.positive.record.id,
        );
        return this.createTransferPairTx(tx, seasonId, data, actorId);
      }

      const rebuilt = this.buildTransferPayloads(seasonId, data, actorId);
      await this.assertNegativeLedgerHasEnoughStockTx(
        tx,
        rebuilt.negative,
        pair.negative,
      );

      const updatedNegative = await this.updateByLedgerTx(
        tx,
        pair.negative,
        rebuilt.negative,
        pair.positive.record.id,
      );
      const updatedPositive = await this.updateByLedgerTx(
        tx,
        pair.positive,
        rebuilt.positive,
        pair.negative.record.id,
      );

      return {
        operationIds: [pair.negative.record.id, pair.positive.record.id],
        negative: updatedNegative,
        positive: updatedPositive,
      };
    });
  }

  async remove(operationId: number) {
    return this.prisma.$transaction(async (tx) => {
      const pair = await this.getTransferPairTx(tx, operationId);
      const deleted = await this.softDeletePairTx(
        tx,
        pair.negative.record.id,
        pair.positive.record.id,
      );

      return {
        operationIds: [pair.negative.record.id, pair.positive.record.id],
        deleted,
      };
    });
  }

  private buildTransferPayloads(
    seasonId: number,
    data: InternalTransferRequestDto,
    actorId: number,
  ) {
    const absoluteQuantity = Math.abs(data.quantity);

    return {
      negative: this.buildLedgerCreateData(
        data,
        seasonId,
        -absoluteQuantity,
        'from',
        actorId,
      ),
      positive: this.buildLedgerCreateData(
        data,
        seasonId,
        absoluteQuantity,
        'to',
        actorId,
      ),
    };
  }

  private buildLedgerCreateData(
    data: InternalTransferRequestDto,
    seasonId: number,
    signedQuantity: number,
    side: 'from' | 'to',
    actorId: number,
  ) {
    const ownerType = side === 'from' ? data.fromOwnerType : data.toOwnerType;
    const sideSpec = this.resolveTransferSideSpec(data, side);

    if (
      ownerType === InventoryOwnerType.TRADER ||
      ownerType === InventoryOwnerType.MODULO
    ) {
      return {
        table: 'traderStock' as const,
        payload: {
          seasonId,
          date: new Date(data.date),
          traderId:
            ownerType === InventoryOwnerType.MODULO
              ? null
              : side === 'from'
                ? data.fromTraderId!
                : data.toTraderId!,
          traderCategoryId: sideSpec.traderCategoryId!,
          grade: sideSpec.grade!,
          pitamStatus: sideSpec.pitamStatus,
          quantity: signedQuantity,
          isModulo: ownerType === InventoryOwnerType.MODULO,
          type: data.type,
          isFromPrivateSelection:
            (side === 'from' && data.stockSource === 'PRIVATE_SELECTION') ||
            (side === 'to' && data.type === 'PRIVATE_SELECTION'),
          shipmentId: null,
          boxId: null,
          notes: data.notes,
          updatedById: actorId,
        },
      };
    }

    return {
      table: 'customerAllocation' as const,
      payload: {
        seasonId,
        date: new Date(data.date),
        dateHebrew: data.dateHebrew ?? new Date(data.date).toLocaleDateString('he-IL'),
        customerId:
          side === 'from' ? data.fromCustomerId! : data.toCustomerId!,
        customerCategoryId: sideSpec.customerCategoryId!,
        pitamStatus: sideSpec.pitamStatus,
        quantity: signedQuantity,
        type: data.type,
        takenFrom: this.resolveTakenFrom(data, side),
        traderId: this.resolveTraderSourceId(data, side),
        shipmentId: null,
        boxId: null,
        notes: data.notes,
        updatedById: actorId,
      },
    };
  }

  private resolveTakenFrom(
    data: InternalTransferRequestDto,
    side: 'from' | 'to',
  ): SourceType {
    const oppositeOwner = side === 'from' ? data.toOwnerType : data.fromOwnerType;
    return oppositeOwner === InventoryOwnerType.TRADER
      ? SourceType.TRADER
      : SourceType.GENERAL;
  }

  private resolveTraderSourceId(
    data: InternalTransferRequestDto,
    side: 'from' | 'to',
  ) {
    const oppositeOwner = side === 'from' ? data.toOwnerType : data.fromOwnerType;
    if (oppositeOwner === InventoryOwnerType.TRADER) {
      return side === 'from'
        ? data.toTraderId ?? null
        : data.fromTraderId ?? null;
    }

    return null;
  }

  private resolveTransferSideSpec(
    data: InternalTransferRequestDto,
    side: 'from' | 'to',
  ): TransferSideSpec {
    const ownerType = side === 'from' ? data.fromOwnerType : data.toOwnerType;
    // pitamStatus is a single shared snapshot across both sides of a transfer by default;
    // fromPitamStatus/toPitamStatus only override it when a side-specific value was supplied.
    // toPitamStatus exists specifically so a MIXED trader batch can be resolved into a definite
    // WITH_PITAM/WITHOUT_PITAM status when it lands on a customer.
    const pitamStatus =
      side === 'from'
        ? data.fromPitamStatus ?? data.pitamStatus
        : data.toPitamStatus ?? data.fromPitamStatus ?? data.pitamStatus;

    if (!pitamStatus) {
      throw new BadRequestException(`${side}PitamStatus is required`);
    }

    if (side === 'to' && ownerType === InventoryOwnerType.CUSTOMER && data.toPitamStatus === PitamStatus.MIXED) {
      throw new BadRequestException('toPitamStatus cannot be MIXED');
    }

    if (
      ownerType === InventoryOwnerType.TRADER ||
      ownerType === InventoryOwnerType.MODULO
    ) {
      const traderCategoryId =
        side === 'from'
          ? data.fromTraderCategoryId ?? data.traderCategoryId
          : data.toTraderCategoryId ?? data.traderCategoryId;
      const grade =
        side === 'from' ? data.fromGrade ?? data.grade : data.toGrade ?? data.grade;

      if (!traderCategoryId) {
        throw new BadRequestException(
          `${side}TraderCategoryId is required for trader/modulo movements`,
        );
      }

      if (!grade) {
        throw new BadRequestException(
          `${side}Grade is required for trader/modulo movements`,
        );
      }

      return {
        pitamStatus,
        traderCategoryId,
        grade,
      };
    }

    const customerCategoryId =
      side === 'from'
        ? data.fromCustomerCategoryId ?? data.customerCategoryId
        : data.toCustomerCategoryId ?? data.customerCategoryId;

    if (!customerCategoryId) {
      throw new BadRequestException(
        `${side}CustomerCategoryId is required for customer movements`,
      );
    }

    return {
      pitamStatus,
      customerCategoryId,
    };
  }

  private async createTransferPairTx(
    tx: Prisma.TransactionClient,
    seasonId: number,
    data: InternalTransferRequestDto,
    actorId: number,
  ) {
    await this.assertTransferCustomerCategoryOwnershipTx(tx, data);
    const built = this.buildTransferPayloads(seasonId, data, actorId);
    await this.assertNegativeLedgerHasEnoughStockTx(tx, built.negative);

    const negative = await this.createByLedgerTx(tx, built.negative);

    const positive =
      built.positive.table === 'traderStock'
        ? await this.createByLedgerTx(tx, {
            table: 'traderStock',
            payload: {
              ...built.positive.payload,
              MovementReferenceId: negative.id,
            },
          })
        : await this.createByLedgerTx(tx, {
            table: 'customerAllocation',
            payload: {
              ...built.positive.payload,
              MovementReferenceId: negative.id,
            },
          });

    await this.patchReferenceTx(tx, built.negative.table, negative.id, positive.id);

    return {
      operationIds: [negative.id, positive.id],
      negative,
      positive,
    };
  }

  private async assertTransferCustomerCategoryOwnershipTx(
    tx: Prisma.TransactionClient,
    data: InternalTransferRequestDto,
  ) {
    const checks: Array<{
      side: 'from' | 'to';
      customerId: number;
      customerCategoryId: number;
    }> = [];

    if (data.fromOwnerType === InventoryOwnerType.CUSTOMER) {
      const fromSpec = this.resolveTransferSideSpec(data, 'from');
      checks.push({
        side: 'from',
        customerId: data.fromCustomerId!,
        customerCategoryId: fromSpec.customerCategoryId!,
      });
    }

    if (data.toOwnerType === InventoryOwnerType.CUSTOMER) {
      const toSpec = this.resolveTransferSideSpec(data, 'to');
      checks.push({
        side: 'to',
        customerId: data.toCustomerId!,
        customerCategoryId: toSpec.customerCategoryId!,
      });
    }

    for (const check of checks) {
      const category = await tx.customerCategories.findUnique({
        where: { id: check.customerCategoryId },
        select: { id: true, customerId: true },
      });

      if (!category || category.customerId !== check.customerId) {
        throw new BadRequestException(
          `${check.side}CustomerCategoryId does not belong to ${check.side}CustomerId`,
        );
      }
    }
  }

  private async getTransferPairTx(
    tx: Prisma.TransactionClient,
    operationId: number,
  ) {
    const directTrader = await tx.traderStock.findFirst({
      where: {
        id: operationId,
        type: {
          in: [
            MovementType.INTERNAL_TRANSFER,
            MovementType.OWNERSHIP_TRANSFER,
            MovementType.ASSIGNED,
          ],
        },
        isDeleted: false,
      },
    });

    const directCustomer = await tx.customerAllocation.findFirst({
      where: {
        id: operationId,
        type: {
          in: [
            MovementType.INTERNAL_TRANSFER,
            MovementType.OWNERSHIP_TRANSFER,
            MovementType.ASSIGNED,
          ],
        },
        isDeleted: false,
      },
    });

    const direct = directTrader ?? directCustomer;
    if (!direct) {
      throw new NotFoundException(`Operation ${operationId} not found`);
    }

    if (!direct.MovementReferenceId) {
      throw new BadRequestException(
        `Operation ${operationId} has no linked opposite movement`,
      );
    }

    const linkedId = direct.MovementReferenceId;

    const linkedTrader = await tx.traderStock.findFirst({
      where: {
        id: linkedId,
        type: {
          in: [
            MovementType.INTERNAL_TRANSFER,
            MovementType.OWNERSHIP_TRANSFER,
            MovementType.ASSIGNED,
          ],
        },
        isDeleted: false,
      },
    });

    const linkedCustomer = await tx.customerAllocation.findFirst({
      where: {
        id: linkedId,
        type: {
          in: [
            MovementType.INTERNAL_TRANSFER,
            MovementType.OWNERSHIP_TRANSFER,
            MovementType.ASSIGNED,
          ],
        },
        isDeleted: false,
      },
    });

    const linked = linkedTrader ?? linkedCustomer;
    if (!linked) {
      throw new BadRequestException(
        `Operation ${operationId} has invalid linked movement ${linkedId}`,
      );
    }

    if (linked.MovementReferenceId !== direct.id) {
      throw new BadRequestException(
        `Operation link mismatch: ${direct.id} <-> ${linked.id} is not reciprocal via MovementReferenceId`,
      );
    }

    const allRows: TransferLedgerRecord[] = [
      directTrader
        ? { table: 'traderStock' as const, record: directTrader }
        : { table: 'customerAllocation' as const, record: directCustomer! },
      linkedTrader
        ? { table: 'traderStock' as const, record: linkedTrader }
        : { table: 'customerAllocation' as const, record: linkedCustomer! },
    ];

    const negative = allRows.find((entry) => entry.record.quantity < 0);
    const positive = allRows.find((entry) => entry.record.quantity > 0);

    if (!negative || !positive) {
      throw new BadRequestException(
        `Operation pair (${direct.id}, ${linked.id}) is incomplete and cannot be updated`,
      );
    }

    return { negative, positive };
  }

  private async assertNegativeLedgerHasEnoughStockTx(
    tx: Prisma.TransactionClient,
    negative:
      | { table: 'traderStock'; payload: Prisma.TraderStockUncheckedCreateInput }
      | {
          table: 'customerAllocation';
          payload: Prisma.CustomerAllocationUncheckedCreateInput;
        },
    existingNegative?: TransferLedgerRecord,
  ) {
    const requiredQuantity = Math.abs(Number(negative.payload.quantity));
    if (requiredQuantity <= 0) {
      return;
    }

    if (negative.table === 'traderStock') {
      const payload = negative.payload;
      const creditQuantity =
        existingNegative && this.isSameTraderSource(existingNegative, payload)
          ? Math.abs(Number(existingNegative.record.quantity))
          : 0;

      await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(tx, {
        seasonId: payload.seasonId,
        traderId: payload.traderId ?? null,
        traderCategoryId: payload.traderCategoryId,
        grade: payload.grade,
        pitamStatus: payload.pitamStatus,
        isModulo: Boolean(payload.isModulo),
        requiredQuantity,
        creditQuantity,
        contextLabel: 'Inventory transfer source check',
        onlyPrivateSelection: payload.isFromPrivateSelection === true,
        excludePrivateSelection: payload.isFromPrivateSelection === false && !Boolean(payload.isModulo),
      });
      return;
    }

    const payload = negative.payload;
    const creditQuantity =
      existingNegative && this.isSameCustomerSource(existingNegative, payload)
        ? Math.abs(Number(existingNegative.record.quantity))
        : 0;

    await this.inventoryAvailabilityService.assertCustomerHasUnshippedStock(tx, {
      seasonId: payload.seasonId,
      customerId: payload.customerId,
      customerCategoryId: payload.customerCategoryId,
      pitamStatus: payload.pitamStatus,
      requiredQuantity,
      creditQuantity,
      contextLabel: 'Inventory transfer source check',
    });
  }

  private isSameTraderSource(
    existingNegative: TransferLedgerRecord,
    nextPayload: Prisma.TraderStockUncheckedCreateInput,
  ) {
    if (existingNegative.table !== 'traderStock') {
      return false;
    }

    const current = existingNegative.record;
    return (
      current.seasonId === nextPayload.seasonId &&
      current.traderId === (nextPayload.traderId ?? null) &&
      current.traderCategoryId === nextPayload.traderCategoryId &&
      current.grade === nextPayload.grade &&
      current.pitamStatus === nextPayload.pitamStatus &&
      current.isModulo === nextPayload.isModulo
    );
  }

  private isSameCustomerSource(
    existingNegative: TransferLedgerRecord,
    nextPayload: Prisma.CustomerAllocationUncheckedCreateInput,
  ) {
    if (existingNegative.table !== 'customerAllocation') {
      return false;
    }

    const current = existingNegative.record;
    return (
      current.seasonId === nextPayload.seasonId &&
      current.customerId === nextPayload.customerId &&
      current.customerCategoryId === nextPayload.customerCategoryId &&
      current.pitamStatus === nextPayload.pitamStatus
    );
  }

  private async softDeletePairTx(
    tx: Prisma.TransactionClient,
    leftId: number,
    rightId: number,
  ) {
    const traderDeleted = await tx.traderStock.updateMany({
      where: {
        isDeleted: false,
        type: {
          in: [
            MovementType.INTERNAL_TRANSFER,
            MovementType.OWNERSHIP_TRANSFER,
            MovementType.ASSIGNED,
          ],
        },
        id: { in: [leftId, rightId] },
      },
      data: { isDeleted: true },
    });

    const customerDeleted = await tx.customerAllocation.updateMany({
      where: {
        isDeleted: false,
        type: {
          in: [
            MovementType.INTERNAL_TRANSFER,
            MovementType.OWNERSHIP_TRANSFER,
            MovementType.ASSIGNED,
          ],
        },
        id: { in: [leftId, rightId] },
      },
      data: { isDeleted: true },
    });

    return {
      traderStock: traderDeleted.count,
      customerAllocations: customerDeleted.count,
    };
  }

  private async createByLedgerTx(
    tx: Prisma.TransactionClient,
    data:
      | { table: 'traderStock'; payload: Prisma.TraderStockUncheckedCreateInput }
      | {
          table: 'customerAllocation';
          payload: Prisma.CustomerAllocationUncheckedCreateInput;
        },
  ) {
    if (data.table === 'traderStock') {
      return tx.traderStock.create({ data: data.payload });
    }

    return tx.customerAllocation.create({ data: data.payload });
  }

  private async updateByLedgerTx(
    tx: Prisma.TransactionClient,
    row: TransferLedgerRecord,
    data:
      | { table: 'traderStock'; payload: Prisma.TraderStockUncheckedCreateInput }
      | {
          table: 'customerAllocation';
          payload: Prisma.CustomerAllocationUncheckedCreateInput;
        },
    referenceId: number,
  ) {
    if (row.table === 'traderStock' && data.table === 'traderStock') {
      return tx.traderStock.update({
        where: { id: row.record.id },
        data: { ...data.payload, MovementReferenceId: referenceId },
      });
    }

    if (
      row.table === 'customerAllocation' &&
      data.table === 'customerAllocation'
    ) {
      return tx.customerAllocation.update({
        where: { id: row.record.id },
        data: { ...data.payload, MovementReferenceId: referenceId },
      });
    }

    throw new BadRequestException(
      'Ledger mismatch while updating transfer operation',
    );
  }

  private async patchReferenceTx(
    tx: Prisma.TransactionClient,
    table: 'traderStock' | 'customerAllocation',
    id: number,
    referenceId: number,
  ) {
    if (table === 'traderStock') {
      await tx.traderStock.update({
        where: { id },
        data: { MovementReferenceId: referenceId },
      });
      return;
    }

    await tx.customerAllocation.update({
      where: { id },
      data: { MovementReferenceId: referenceId },
    });
  }

  private usesCustomerLedger(ownerType: InventoryOwnerType) {
    return ownerType === InventoryOwnerType.CUSTOMER;
  }

  private getExpectedTables(data: InternalTransferRequestDto) {
    const tableA = this.usesCustomerLedger(data.fromOwnerType)
      ? 'customerAllocation'
      : 'traderStock';
    const tableB = this.usesCustomerLedger(data.toOwnerType)
      ? 'customerAllocation'
      : 'traderStock';
    return [tableA, tableB].sort().join('|');
  }
}
