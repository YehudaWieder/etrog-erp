import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ClassificationRepository } from 'src/harvest/services/harvest-core/repositories/classification.repository';
import { SeasonsService } from 'src/seasons/seasons.service';
import { buildClassificationDailySummary } from 'src/harvest/classifications/utils/classification-daily-summary.util';
import { CreateClassificationDto } from 'src/harvest/classifications/dto/create-classification.dto';
import { UpdateClassificationDto } from 'src/harvest/classifications/dto/update-classification.dto';
import { throwClassificationMutationGuardError } from 'src/harvest/classifications/utils/classification-mutation-guard.util';

@Injectable()
export class ClassificationService {
  constructor(
    private readonly classificationRepository: ClassificationRepository,
    private seasonsService: SeasonsService,
  ) {}

  // Mutations are centralized under Harvest workflow.
  async create(data: CreateClassificationDto) {
    void data;
    throwClassificationMutationGuardError('create');
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

  async update(id: number, data: UpdateClassificationDto) {
    void id;
    void data;
    throwClassificationMutationGuardError('update');
  }

  // Mutations are centralized under Harvest workflow.
  async remove(id: number) {
    void id;
    throwClassificationMutationGuardError('delete');
  }
}