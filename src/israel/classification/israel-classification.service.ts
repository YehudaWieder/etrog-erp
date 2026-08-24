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

  async getFieldCategorySummaryBySeason(seasonId: number) {
    const classifications = await this.prisma.israelClassification.findMany({
      where: { seasonId },
      select: {
        grade: true,
        quantity: true,
        category: { select: { gradeGroups: true } },
        fieldCategory: {
          select: {
            id: true,
            name: true,
            price: true,
            currency: true,
            field: { select: { id: true, name: true } },
          },
        },
      },
    });

    type FieldCategoryAgg = {
      fieldId: number;
      fieldName: string;
      fieldCategoryId: number;
      fieldCategoryName: string;
      price: number;
      currency: string;
      quantity: number;
      gradeGroupTotals: Map<string, number>;
    };

    const byFieldCategory = new Map<number, FieldCategoryAgg>();

    for (const record of classifications) {
      const fieldCategory = record.fieldCategory;
      if (!fieldCategory) continue;

      let agg = byFieldCategory.get(fieldCategory.id);
      if (!agg) {
        agg = {
          fieldId: fieldCategory.field.id,
          fieldName: fieldCategory.field.name,
          fieldCategoryId: fieldCategory.id,
          fieldCategoryName: fieldCategory.name,
          price: Number(fieldCategory.price),
          currency: fieldCategory.currency,
          quantity: 0,
          gradeGroupTotals: new Map(),
        };
        byFieldCategory.set(fieldCategory.id, agg);
      }

      agg.quantity += record.quantity;

      const gradeGroups =
        (record.category?.gradeGroups as
          | { name: string; grades: string[] }[]
          | null) ?? [];
      const groupName =
        gradeGroups.find((group) => group.grades.includes(record.grade))
          ?.name ?? null;
      const groupKey = groupName ?? '';
      agg.gradeGroupTotals.set(
        groupKey,
        (agg.gradeGroupTotals.get(groupKey) ?? 0) + record.quantity,
      );
    }

    const byField = new Map<
      number,
      {
        fieldId: number;
        fieldName: string;
        categories: {
          fieldCategoryId: number;
          fieldCategoryName: string;
          quantity: number;
          price: number;
          currency: string;
          total: number;
          gradeGroupSplits: {
            groupName: string | null;
            quantity: number;
            percent: number;
          }[];
        }[];
      }
    >();

    for (const agg of byFieldCategory.values()) {
      if (agg.quantity <= 0) continue;

      let fieldEntry = byField.get(agg.fieldId);
      if (!fieldEntry) {
        fieldEntry = {
          fieldId: agg.fieldId,
          fieldName: agg.fieldName,
          categories: [],
        };
        byField.set(agg.fieldId, fieldEntry);
      }

      const gradeGroupSplits = [...agg.gradeGroupTotals.entries()].map(
        ([groupKey, quantity]) => ({
          groupName: groupKey === '' ? null : groupKey,
          quantity,
          percent: agg.quantity > 0 ? (quantity / agg.quantity) * 100 : 0,
        }),
      );

      fieldEntry.categories.push({
        fieldCategoryId: agg.fieldCategoryId,
        fieldCategoryName: agg.fieldCategoryName,
        quantity: agg.quantity,
        price: agg.price,
        currency: agg.currency,
        total: agg.quantity * agg.price,
        gradeGroupSplits,
      });
    }

    return [...byField.values()]
      .map((field) => ({
        ...field,
        categories: field.categories.sort((a, b) =>
          a.fieldCategoryName.localeCompare(b.fieldCategoryName, 'he'),
        ),
      }))
      .sort((a, b) => a.fieldName.localeCompare(b.fieldName, 'he'));
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
