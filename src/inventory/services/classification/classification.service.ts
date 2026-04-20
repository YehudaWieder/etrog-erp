// src/inventory/services/classification/classification.service.ts

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ClassificationService {
  constructor(private prisma: PrismaService) {}

  // Create a new classification entry
  async create(data: Prisma.ClassificationUncheckedCreateInput) {
    // Generate unique slug to prevent duplicates based on your unique constraint
    const slug = `harvest-${data.fieldHarvestId}-tcat-${data.traderCategoryId ?? 0}-ccat-${data.customerCategoryId ?? 0}-g-${data.grade ?? 'NA'}-a-${data.assignmentType}`;

    const existing = await this.prisma.classification.findUnique({
      where: { slug },
    });
    
    if (existing) {
      if (existing.isDeleted) {
        // If it was soft-deleted, we "restore" and update it
        return this.update(existing.id, { ...data, isDeleted: false });
      }
      throw new ConflictException('This classification combination already exists for this harvest');
    }

    return this.prisma.classification.create({
      data: {
        ...data,
        slug,
      },
    });
  }

  // Get all classifications for a specific harvest report
  async findByHarvest(fieldHarvestId: number) {
    return this.prisma.classification.findMany({
      where: { fieldHarvestId, isDeleted: false },
      include: {
        trader: { select: { name: true } },
        customer: { select: { customerName: true } },
        traderCategory: { select: { name: true } },
        customerCategory: { select: { name: true, grade: true } },
        updatedBy: { select: { name: true } },
      },
    });
  }

  // Get all classifications for a season
  async findAllBySeason(seasonId: number) {
    return this.prisma.classification.findMany({
      where: { seasonId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.classification.findFirst({
      where: { id, isDeleted: false },
    });
    if (!record) throw new NotFoundException(`Classification #${id} not found`);
    return record;
  }

  async update(id: number, data: Prisma.ClassificationUncheckedUpdateInput) {
    return this.prisma.classification.update({
      where: { id },
      data,
    });
  }

  // Soft Delete
  async remove(id: number) {
    return this.prisma.classification.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
