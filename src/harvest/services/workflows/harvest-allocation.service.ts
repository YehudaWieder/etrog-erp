import { BadRequestException, Injectable } from '@nestjs/common';
import { AssignmentType, Grade, MovementType, Prisma } from '@prisma/client';
import { ClassificationBulkItemDto } from 'src/harvest/services/harvest-core/dto/harvest.dto';
import { GeneralShareAllocationService } from 'src/inventory/services/general-share-allocation/general-share-allocation.service';

@Injectable()
export class HarvestAllocationService {
  constructor(private readonly generalShareAllocationService: GeneralShareAllocationService) {}

  async processAllocationsForClassification(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: number;
      classificationId: number;
      classificationItem: ClassificationBulkItemDto;
      harvestDate: Date;
      updatedById: number;
      remainsInItalyGradeH: boolean;
      remainsInItalyGradeV: boolean;
    },
  ) {
    const classItem = params.classificationItem;

    if (classItem.assignmentType === AssignmentType.CUSTOMER) {
      await tx.customerAllocation.create({
        data: {
          seasonId: params.seasonId,
          date: params.harvestDate,
          dateHebrew: new Date(params.harvestDate).toLocaleDateString('he-IL'),
          customerId: classItem.customerId!,
          customerCategoryId: classItem.customerCategoryId!,
          pitamStatus: classItem.pitamStatus,
          quantity: classItem.quantity,
          type: MovementType.HARVEST_IN,
          takenFrom: 'GENERAL',
          MovementReferenceId: params.classificationId,
          updatedById: params.updatedById,
          notes: classItem.notes,
        },
      });
      return;
    }

    if (classItem.assignmentType === AssignmentType.TRADER) {
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
          type: MovementType.PRIVATE_SELECTION,
          isFromPrivateSelection: true,
          MovementReferenceId: params.classificationId,
          updatedById: params.updatedById,
          notes: classItem.notes,
        },
      });
      return;
    }

    if (classItem.assignmentType !== AssignmentType.GENERAL) {
      throw new BadRequestException(
        `Unsupported assignmentType for allocation processing: ${classItem.assignmentType}`,
      );
    }

    if (!classItem.traderCategoryId) {
      throw new BadRequestException('traderCategoryId is required for GENERAL classifications');
    }

    if (!classItem.grade) {
      throw new BadRequestException('grade is required for GENERAL classifications');
    }

    const remainsInItaly =
      (classItem.grade === Grade.ה && params.remainsInItalyGradeH) ||
      (classItem.grade === Grade.ו && params.remainsInItalyGradeV);

    if (remainsInItaly) {
      await tx.traderStock.create({
        data: {
          seasonId: params.seasonId,
          date: params.harvestDate,
          traderId: null,
          traderCategoryId: classItem.traderCategoryId,
          grade: classItem.grade,
          pitamStatus: classItem.pitamStatus,
          quantity: classItem.quantity,
          isModulo: false,
          type: MovementType.REMAINS_IN_ITALY,
          MovementReferenceId: params.classificationId,
          updatedById: params.updatedById,
          notes: classItem.notes,
        },
      });
      return;
    }

    await this.generalShareAllocationService.allocateGeneralQuantity(tx, {
      seasonId: params.seasonId,
      date: params.harvestDate,
      traderCategoryId: classItem.traderCategoryId,
      grade: classItem.grade,
      pitamStatus: classItem.pitamStatus,
      quantity: classItem.quantity,
      movementReferenceId: params.classificationId,
      updatedById: params.updatedById,
      notes: classItem.notes,
    });
  }

  async deleteLinkedMovements(tx: Prisma.TransactionClient, classificationId: number) {
    await tx.customerAllocation.deleteMany({
      where: {
        MovementReferenceId: classificationId,
        type: MovementType.HARVEST_IN,
        shipmentId: null,
        boxId: null,
      },
    });

    await tx.traderStock.deleteMany({
      where: {
        MovementReferenceId: classificationId,
        type: {
          in: [
            MovementType.HARVEST_IN,
            MovementType.ASSIGNED,
            MovementType.PRIVATE_SELECTION,
            MovementType.REMAINS_IN_ITALY,
          ],
        },
        shipmentId: null,
        boxId: null,
      },
    });
  }
}
