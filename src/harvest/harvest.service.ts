// src/harvest/harvest.service.ts

import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class HarvestService {
  constructor(private prisma: PrismaService) {}

  // Calculate rejection rates before saving
  private calculateRates(data: any) {
    const totalHarvested = data.totalHarvested || 0;
    const totalRejected = data.totalRejected || 0;
    const ownerHarvested = data.ownerHarvested || 0;
    const ownerRejected = data.ownerRejected || 0;

    return {
      rejectionRate: totalHarvested > 0 ? (totalRejected / totalHarvested) * 100 : 0,
      ownerRejectionRate: ownerHarvested > 0 ? (ownerRejected / ownerHarvested) * 100 : 0,
    };
  }

  // Create a new harvest report
  async create(data: Prisma.FieldHarvestUncheckedCreateInput) {
    // Generate unique slug: date-field-season
    const dateStr = new Date(data.dateGregorian).toISOString().split('T')[0];
    const slug = `${dateStr}-f${data.fieldId}-s${data.seasonId}`;

    const existing = await this.prisma.fieldHarvest.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('A report for this field and date already exists');

    const rates = this.calculateRates(data);

    return this.prisma.fieldHarvest.create({
      data: {
        ...data,
        slug,
        ...rates,
      },
    });
  }

  // Get all reports for a season (excluding soft-deleted)
  async findAllBySeason(seasonId: number) {
    return this.prisma.fieldHarvest.findMany({
      where: { seasonId, isDeleted: false },
      include: {
        field: { select: { name: true } },
        updatedBy: { select: { name: true } },
      },
      orderBy: { dateGregorian: 'desc' },
    });
  }

  // Get single report
  async findOne(id: number) {
    const report = await this.prisma.fieldHarvest.findFirst({
      where: { id, isDeleted: false },
      include: {
        field: true,
        classifications: true,
      },
    });
    if (!report) throw new NotFoundException(`Harvest report #${id} not found`);
    return report;
  }

  // Get report by field name and date
  async findByFieldNameAndDate(fieldName: string, date: string) {
    return this.prisma.fieldHarvest.findFirst({
      where: {
        field: { name: fieldName },
        dateGregorian: new Date(date),
        isDeleted: false,
      },
      include: {
        field: true,
        classifications: true,
      },
    });
  }

  // Update report
  async update(id: number, data: Prisma.FieldHarvestUncheckedUpdateInput) {
    const current = await this.findOne(id);
    
    // Merge current and new data for rate calculation
    const mergedData = { ...current, ...data };
    const rates = this.calculateRates(mergedData);

    return this.prisma.fieldHarvest.update({
      where: { id },
      data: {
        ...data,
        ...rates,
      },
    });
  }

  // Soft delete
  async remove(id: number) {
    return this.prisma.fieldHarvest.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}