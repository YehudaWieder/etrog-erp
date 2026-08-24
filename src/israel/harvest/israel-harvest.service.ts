import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditLogService } from 'src/audit/audit.service';
import { CreateIsraelHarvestDto } from './dto/create-israel-harvest.dto';
import { UpdateIsraelHarvestDto } from './dto/update-israel-harvest.dto';

const harvestInclude = {
  field: { select: { id: true, name: true } },
  updatedBy: { select: { name: true } },
} satisfies Prisma.IsraelHarvestInclude;

@Injectable()
export class IsraelHarvestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAllBySeason(seasonId: number) {
    return this.prisma.israelHarvest.findMany({
      where: { seasonId },
      include: harvestInclude,
      orderBy: [{ dateGregorian: 'desc' }, { id: 'desc' }],
    });
  }

  async create(dto: CreateIsraelHarvestDto, actorId: number) {
    if (!Number.isFinite(dto.quantity) || dto.quantity < 0) {
      throw new BadRequestException('Quantity must be a non-negative number.');
    }

    await this.assertDateMatchesSeason(dto.seasonId, dto.dateGregorian);

    try {
      const created = await this.prisma.israelHarvest.create({
        data: {
          seasonId: dto.seasonId,
          fieldId: dto.fieldId,
          dateGregorian: new Date(dto.dateGregorian),
          dateHebrew: dto.dateHebrew,
          quantity: dto.quantity,
          notes: dto.notes,
          updatedById: actorId,
        },
        include: harvestInclude,
      });

      await this.auditLog.record({
        userId: actorId,
        action: 'CREATE',
        entityType: 'IsraelHarvest',
        entityId: created.id,
        after: created,
      });

      return created;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('Invalid season or field reference.');
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateIsraelHarvestDto, actorId: number) {
    const current = await this.prisma.israelHarvest.findUnique({ where: { id }, include: harvestInclude });
    if (!current) {
      throw new NotFoundException('Israel harvest record not found.');
    }

    if (dto.quantity !== undefined && (!Number.isFinite(dto.quantity) || dto.quantity < 0)) {
      throw new BadRequestException('Quantity must be a non-negative number.');
    }

    if (dto.dateGregorian) {
      await this.assertDateMatchesSeason(current.seasonId, dto.dateGregorian);
    }

    const updated = await this.prisma.israelHarvest.update({
      where: { id },
      data: {
        fieldId: dto.fieldId,
        dateGregorian: dto.dateGregorian ? new Date(dto.dateGregorian) : undefined,
        dateHebrew: dto.dateHebrew,
        quantity: dto.quantity,
        notes: dto.notes,
        updatedById: actorId,
      },
      include: harvestInclude,
    });

    await this.auditLog.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'IsraelHarvest',
      entityId: id,
      before: current,
      after: updated,
    });

    return updated;
  }

  async remove(id: number, actorId: number) {
    const current = await this.prisma.israelHarvest.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException('Israel harvest record not found.');
    }

    try {
      const deleted = await this.prisma.israelHarvest.delete({ where: { id } });

      await this.auditLog.record({
        userId: actorId,
        action: 'DELETE',
        entityType: 'IsraelHarvest',
        entityId: id,
        before: current,
      });

      return deleted;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Cannot delete a harvest that has related sorting records.');
      }
      throw error;
    }
  }

  private async assertDateMatchesSeason(seasonId: number, dateGregorian: string) {
    const season = await this.prisma.season.findUnique({ where: { id: seasonId } });
    if (!season) {
      throw new BadRequestException('Invalid season reference.');
    }

    const harvestYear = new Date(dateGregorian).getUTCFullYear();
    if (harvestYear !== season.yearName) {
      throw new BadRequestException(
        `Harvest date year (${harvestYear}) does not match the selected season (${season.yearName}).`,
      );
    }
  }
}
