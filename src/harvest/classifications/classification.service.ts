import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { ClassificationRepository } from 'src/harvest/services/harvest-core/repositories/classification.repository';
import { SeasonsService } from 'src/seasons/seasons.service';
import { buildClassificationDailySummary } from 'src/harvest/classifications/utils/classification-daily-summary.util';

@Injectable()
export class ClassificationService {
  constructor(
    private readonly classificationRepository: ClassificationRepository,
    private seasonsService: SeasonsService,
  ) {}

  // Mutations are centralized under Harvest workflow.
  async create(data: Prisma.ClassificationUncheckedCreateInput) {
    void data;
    throw new BadRequestException(
      'Classification create is centralized under harvest workflow. Use POST /harvests/classifications with body-based harvestId and isPartialClassification.',
    );
  }

  // Get all classifications for a specific harvest report
  async findByHarvest(fieldHarvestId: number) {
    return this.classificationRepository.findByHarvest(fieldHarvestId);
  }

  // Get all classifications for a season
  async findAllBySeason(seasonId: number) {
    await this.seasonsService.assertSeasonExists(seasonId);
    return this.classificationRepository.findAllBySeason(seasonId);
  }

  async findDailySummaryBySeason(seasonId: number) {
    await this.seasonsService.assertSeasonExists(seasonId);

    const records = await this.classificationRepository.findDailySummarySourceRows(seasonId);
    return buildClassificationDailySummary(records);
  }

  async findOne(id: number) {
    const record = await this.classificationRepository.findOne(id);
    if (!record) throw new NotFoundException(`Classification #${id} not found`);
    return record;
  }

  async update(id: number, data: Prisma.ClassificationUncheckedUpdateInput) {
    void id;
    void data;
    throw new BadRequestException(
      'Classification update is centralized under harvest workflow. Use PATCH /harvests/classifications with body-based harvestId, classificationId, and isPartialClassification.',
    );
  }

  // Mutations are centralized under Harvest workflow.
  async remove(id: number) {
    void id;
    throw new BadRequestException(
      'Classification delete is centralized under harvest workflow. Use DELETE /harvests/classifications with body-based harvestId, classificationId, and isPartialClassification.',
    );
  }
}