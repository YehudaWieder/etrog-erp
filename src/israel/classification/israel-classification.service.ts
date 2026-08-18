import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditLogService } from 'src/audit/audit.service';
import { CreateIsraelClassificationDto } from './dto/create-israel-classification.dto';

const classificationInclude = {
  category: { select: { id: true, name: true } },
  fieldCategory: { select: { id: true, name: true } },
  harvest: { select: { id: true, quantity: true, field: { select: { id: true, name: true } } } },
} satisfies Prisma.IsraelClassificationInclude;

const seasonClassificationInclude = {
  category: { select: { id: true, name: true, orderIndex: true, gradeGroups: true } },
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

    const harvest = await this.prisma.israelHarvest.findUnique({ where: { id: dto.harvestId } });
    if (!harvest) {
      throw new NotFoundException('Israel harvest record not found.');
    }

    const category = await this.prisma.israelSortCategory.findUnique({ where: { id: dto.categoryId } });
    if (!category) {
      throw new NotFoundException('Israel sort category not found.');
    }

    if (!category.supportedGrades.includes(dto.grade)) {
      throw new BadRequestException(`Grade "${dto.grade}" is not supported by category "${category.name}".`);
    }

    const fieldCategory = await this.prisma.israelFieldCategory.findUnique({ where: { id: dto.fieldCategoryId } });
    if (!fieldCategory) {
      throw new NotFoundException('Israel seller/field category not found.');
    }

    if (fieldCategory.fieldId !== harvest.fieldId || fieldCategory.seasonId !== harvest.seasonId) {
      throw new BadRequestException('The selected seller/field category does not belong to this harvest.');
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

    const created = await this.prisma.israelClassification.create({
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

    await this.auditLog.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'IsraelClassification',
      entityId: created.id,
      after: created,
    });

    return created;
  }
}
