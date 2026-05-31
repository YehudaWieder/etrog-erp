import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class HarvestRepository {
  constructor(private readonly prisma: PrismaService) {}

  findBySlug(slug: string) {
    return this.prisma.fieldHarvest.findUnique({ where: { slug } });
  }

  create(data: Prisma.FieldHarvestUncheckedCreateInput) {
    return this.prisma.fieldHarvest.create({ data });
  }

  findAllBySeason(seasonId: number) {
    return this.prisma.fieldHarvest.findMany({
      where: { seasonId, isDeleted: false },
      include: {
        field: { select: { name: true } },
        updatedBy: { select: { name: true } },
      },
      orderBy: { dateGregorian: 'desc' },
    });
  }

  findRowsForFieldTotals(seasonId: number) {
    return this.prisma.fieldHarvest.findMany({
      where: { seasonId, isDeleted: false },
      select: {
        fieldId: true,
        field: { select: { name: true } },
        totalHarvested: true,
        totalRejected: true,
        totalAfterRejected: true,
        classifiedTotal: true,
        rejectionRate: true,
        ownerHarvested: true,
        ownerRejected: true,
        ownerAfterRejected: true,
        ownerRejectionRate: true,
        isPartialClassification: true,
      },
    });
  }

  findBySeasonAndField(seasonId: number, fieldId: number) {
    return this.prisma.fieldHarvest.findMany({
      where: { seasonId, fieldId, isDeleted: false },
      include: {
        field: { select: { name: true } },
        updatedBy: { select: { name: true } },
      },
      orderBy: [{ dateGregorian: 'desc' }, { id: 'desc' }],
    });
  }

  findSeasonName(seasonId: number) {
    return this.prisma.season.findUnique({ where: { id: seasonId }, select: { yearName: true } });
  }

  findOneWithRelations(id: number) {
    return this.prisma.fieldHarvest.findFirst({
      where: { id, isDeleted: false },
      include: { field: true, classifications: true },
    });
  }

  findByFieldNameAndDate(fieldName: string, date: Date) {
    return this.prisma.fieldHarvest.findFirst({
      where: {
        field: { name: fieldName },
        dateGregorian: date,
        isDeleted: false,
      },
      include: { field: true, classifications: true },
    });
  }

  findUniqueById(id: number) {
    return this.prisma.fieldHarvest.findUnique({ where: { id } });
  }

  update(id: number, data: Prisma.FieldHarvestUncheckedUpdateInput) {
    return this.prisma.fieldHarvest.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.prisma.fieldHarvest.delete({ where: { id } });
  }
}
