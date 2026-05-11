import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';

@Injectable()
export class ClassificationService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

  // Mutations are centralized under Harvest workflow.
  async create(data: Prisma.ClassificationUncheckedCreateInput) {
    void data;
    throw new BadRequestException(
      'Classification create is centralized under harvest workflow. Use POST /harvests/:harvestId/classifications with validationMode.',
    );
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
    await this.seasonsService.assertSeasonExists(seasonId);

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
    void id;
    void data;
    throw new BadRequestException(
      'Classification update is centralized under harvest workflow. Use PATCH /harvests/:harvestId/classifications/:classificationId with validationMode.',
    );
  }

  // Mutations are centralized under Harvest workflow.
  async remove(id: number) {
    void id;
    throw new BadRequestException(
      'Classification delete is centralized under harvest workflow. Use DELETE /harvests/:harvestId/classifications/:classificationId with validationMode.',
    );
  }
}