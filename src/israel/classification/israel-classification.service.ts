import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditLogService } from 'src/audit/audit.service';
import { CreateIsraelClassificationDto } from './dto/create-israel-classification.dto';
import { UpdateIsraelClassificationDto } from './dto/update-israel-classification.dto';

const classificationInclude = {
  category: { select: { id: true, name: true } },
  fieldCategory: { select: { id: true, name: true } },
  harvest: {
    select: {
      id: true,
      quantity: true,
      field: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.IsraelClassificationInclude;

const seasonClassificationInclude = {
  category: {
    select: { id: true, name: true, orderIndex: true, gradeGroups: true },
  },
  fieldCategory: { select: { id: true, name: true } },
  harvest: {
    select: {
      id: true,
      fieldId: true,
      dateGregorian: true,
      dateHebrew: true,
      field: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.IsraelClassificationInclude;

@Injectable()
export class IsraelClassificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAllByHarvest(harvestId: number) {
    return this.prisma.israelClassification.findMany({
      where: { harvestId },
      include: classificationInclude,
      orderBy: { id: 'asc' },
    });
  }

  async findAllBySeason(seasonId: number) {
    return this.prisma.israelClassification.findMany({
      where: { seasonId },
      include: seasonClassificationInclude,
      orderBy: [{ harvest: { dateGregorian: 'desc' } }, { id: 'asc' }],
    });
  }

  async create(dto: CreateIsraelClassificationDto, actorId: number) {
    if (!Number.isFinite(dto.quantity) || dto.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero.');
    }

    const harvest = await this.prisma.israelHarvest.findUnique({
      where: { id: dto.harvestId },
    });
    if (!harvest) {
      throw new NotFoundException('Israel harvest record not found.');
    }

    const category = await this.prisma.israelSortCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Israel sort category not found.');
    }

    if (!category.supportedGrades.includes(dto.grade)) {
      throw new BadRequestException(
        `Grade "${dto.grade}" is not supported by category "${category.name}".`,
      );
    }

    const fieldCategory = await this.prisma.israelFieldCategory.findUnique({
      where: { id: dto.fieldCategoryId },
    });
    if (!fieldCategory) {
      throw new NotFoundException('Israel seller/field category not found.');
    }

    if (
      fieldCategory.fieldId !== harvest.fieldId ||
      fieldCategory.seasonId !== harvest.seasonId
    ) {
      throw new BadRequestException(
        'The selected seller/field category does not belong to this harvest.',
      );
    }

    const existingTotal = await this.prisma.israelClassification.aggregate({
      where: { harvestId: dto.harvestId },
      _sum: { quantity: true },
    });
    const alreadyClassified = existingTotal._sum.quantity ?? 0;

    if (alreadyClassified + dto.quantity > harvest.quantity) {
      throw new BadRequestException(
        `Total sorted quantity (${alreadyClassified + dto.quantity}) cannot exceed the harvested quantity (${harvest.quantity}).`,
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const createdClassification = await tx.israelClassification.create({
        data: {
          seasonId: harvest.seasonId,
          harvestId: dto.harvestId,
          fieldCategoryId: dto.fieldCategoryId,
          categoryId: dto.categoryId,
          grade: dto.grade,
          pitamStatus: dto.pitamStatus,
          quantity: dto.quantity,
          notes: dto.notes,
          updatedById: actorId,
        },
        include: classificationInclude,
      });

      await tx.israelStock.create({
        data: {
          seasonId: harvest.seasonId,
          date: harvest.dateGregorian,
          fieldId: harvest.fieldId,
          categoryId: dto.categoryId,
          grade: dto.grade,
          pitamStatus: dto.pitamStatus,
          quantity: dto.quantity,
          type: 'HARVEST_IN',
          movementReferenceId: createdClassification.id,
          notes: dto.notes,
          updatedById: actorId,
        },
      });

      return createdClassification;
    });

    await this.auditLog.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'IsraelClassification',
      entityId: created.id,
      after: created,
    });

    return created;
  }

  async update(
    id: number,
    dto: UpdateIsraelClassificationDto,
    actorId: number,
  ) {
    const current = await this.prisma.israelClassification.findUnique({
      where: { id },
    });
    if (!current) {
      throw new NotFoundException('Israel sorting record not found.');
    }

    const harvest = await this.prisma.israelHarvest.findUnique({
      where: { id: current.harvestId },
    });
    if (!harvest) {
      throw new NotFoundException('Israel harvest record not found.');
    }

    const nextCategoryId = dto.categoryId ?? current.categoryId;
    const nextGrade = dto.grade ?? current.grade;
    const nextFieldCategoryId = dto.fieldCategoryId ?? current.fieldCategoryId;
    const nextQuantity = dto.quantity ?? current.quantity;

    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero.');
    }

    const category = await this.prisma.israelSortCategory.findUnique({
      where: { id: nextCategoryId },
    });
    if (!category) {
      throw new NotFoundException('Israel sort category not found.');
    }

    if (!category.supportedGrades.includes(nextGrade)) {
      throw new BadRequestException(
        `Grade "${nextGrade}" is not supported by category "${category.name}".`,
      );
    }

    const fieldCategory = await this.prisma.israelFieldCategory.findUnique({
      where: { id: nextFieldCategoryId },
    });
    if (!fieldCategory) {
      throw new NotFoundException('Israel seller/field category not found.');
    }

    if (
      fieldCategory.fieldId !== harvest.fieldId ||
      fieldCategory.seasonId !== harvest.seasonId
    ) {
      throw new BadRequestException(
        'The selected seller/field category does not belong to this harvest.',
      );
    }

    const existingTotal = await this.prisma.israelClassification.aggregate({
      where: { harvestId: current.harvestId, id: { not: id } },
      _sum: { quantity: true },
    });
    const alreadyClassified = existingTotal._sum.quantity ?? 0;

    if (alreadyClassified + nextQuantity > harvest.quantity) {
      throw new BadRequestException(
        `Total sorted quantity (${alreadyClassified + nextQuantity}) cannot exceed the harvested quantity (${harvest.quantity}).`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedClassification = await tx.israelClassification.update({
        where: { id },
        data: {
          fieldCategoryId: dto.fieldCategoryId,
          categoryId: dto.categoryId,
          grade: dto.grade,
          pitamStatus: dto.pitamStatus,
          quantity: dto.quantity,
          notes: dto.notes,
          updatedById: actorId,
        },
        include: classificationInclude,
      });

      await tx.israelStock.updateMany({
        where: {
          movementReferenceId: id,
          type: 'HARVEST_IN',
          isDeleted: false,
        },
        data: { isDeleted: true },
      });

      await tx.israelStock.create({
        data: {
          seasonId: harvest.seasonId,
          date: harvest.dateGregorian,
          fieldId: harvest.fieldId,
          categoryId: nextCategoryId,
          grade: nextGrade,
          pitamStatus: dto.pitamStatus ?? current.pitamStatus,
          quantity: nextQuantity,
          type: 'HARVEST_IN',
          movementReferenceId: id,
          notes: dto.notes ?? current.notes,
          updatedById: actorId,
        },
      });

      return updatedClassification;
    });

    await this.auditLog.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'IsraelClassification',
      entityId: id,
      before: current,
      after: updated,
    });

    return updated;
  }

  async remove(id: number, actorId: number) {
    const current = await this.prisma.israelClassification.findUnique({
      where: { id },
    });
    if (!current) {
      throw new NotFoundException('Israel sorting record not found.');
    }

    const deleted = await this.prisma.$transaction(async (tx) => {
      await tx.israelStock.updateMany({
        where: {
          movementReferenceId: id,
          type: 'HARVEST_IN',
          isDeleted: false,
        },
        data: { isDeleted: true },
      });

      return tx.israelClassification.delete({ where: { id } });
    });

    await this.auditLog.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'IsraelClassification',
      entityId: id,
      before: current,
    });

    return deleted;
  }
}
