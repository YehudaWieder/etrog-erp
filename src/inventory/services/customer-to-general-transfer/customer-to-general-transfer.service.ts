import { BadRequestException, Injectable } from '@nestjs/common';
import { MovementType, Prisma, SourceType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SeasonsService } from 'src/seasons/seasons.service';
import { InventoryAvailabilityService } from '../inventory-availability.service';
import { GeneralShareAllocationService } from '../general-share-allocation/general-share-allocation.service';
import { CreateCustomerToGeneralTransferDto } from './dto/create-customer-to-general-transfer.dto';

@Injectable()
export class CustomerToGeneralTransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonsService: SeasonsService,
    private readonly inventoryAvailabilityService: InventoryAvailabilityService,
    private readonly generalShareAllocationService: GeneralShareAllocationService,
  ) {}

  async create(dto: CreateCustomerToGeneralTransferDto, actorId: number) {
    const { id: seasonId } = await this.seasonsService.findActiveSeason();
    const anchor = await this.prisma.$transaction(async (tx) => this.createInTx(tx, seasonId, dto, actorId));
    return { id: anchor.id };
  }

  private async createInTx(
    tx: Prisma.TransactionClient,
    seasonId: number,
    dto: CreateCustomerToGeneralTransferDto,
    actorId: number,
  ) {
    this.validate(dto);
    const date = dto.date ? new Date(dto.date) : new Date();
    // toPitamStatus lets a MIXED customer balance land as a definite WITH_PITAM/WITHOUT_PITAM
    // status on the trader side - mirrors resolveTransferSideSpec's fallback chain in
    // internal-transfer.service.ts. Only the destination rows use it; the customer-side anchor
    // always reflects the actual source pitamStatus.
    const destinationPitamStatus = dto.toPitamStatus ?? dto.pitamStatus;

    await this.inventoryAvailabilityService.assertCustomerHasUnshippedStock(tx, {
      seasonId,
      customerId: dto.customerId,
      customerCategoryId: dto.customerCategoryId,
      pitamStatus: dto.pitamStatus,
      requiredQuantity: dto.quantity,
      contextLabel: 'Customer stock transfer to general pool',
    });

    const anchor = await tx.customerAllocation.create({
      data: {
        seasonId,
        date,
        dateHebrew: date.toLocaleDateString('he-IL'),
        customerId: dto.customerId,
        customerCategoryId: dto.customerCategoryId,
        pitamStatus: dto.pitamStatus,
        quantity: -dto.quantity,
        type: MovementType.INTERNAL_TRANSFER,
        takenFrom: SourceType.GENERAL,
        traderId: null,
        updatedById: actorId,
        notes: dto.notes,
      },
    });

    if (dto.toRemainsInItaly) {
      await tx.traderStock.create({
        data: {
          seasonId,
          date,
          traderId: null,
          isModulo: false,
          traderCategoryId: dto.traderCategoryId,
          grade: dto.grade,
          pitamStatus: destinationPitamStatus,
          quantity: dto.quantity,
          type: MovementType.INTERNAL_TRANSFER,
          MovementReferenceId: anchor.id,
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
        pitamStatus: destinationPitamStatus,
        quantity: dto.quantity,
        type: MovementType.INTERNAL_TRANSFER,
        movementReferenceId: anchor.id,
        updatedById: actorId,
        notes: dto.notes,
      });
    }

    return anchor;
  }

  private validate(dto: CreateCustomerToGeneralTransferDto) {
    if (
      !dto.customerId ||
      !dto.customerCategoryId ||
      !dto.pitamStatus ||
      !dto.grade ||
      !dto.traderCategoryId ||
      !dto.quantity ||
      dto.quantity <= 0
    ) {
      throw new BadRequestException(
        'customerId, customerCategoryId, pitamStatus, grade, traderCategoryId, and a positive quantity are required',
      );
    }

    if (dto.toRemainsInItaly && dto.grade !== 'ה' && dto.grade !== 'ו') {
      throw new BadRequestException('toRemainsInItaly is only valid for grade ה or ו');
    }
  }
}
