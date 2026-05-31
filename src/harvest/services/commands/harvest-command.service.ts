import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, MovementType } from 'src/generated/prisma';
import { FieldHarvestCreateDto, FieldHarvestUpdateDto } from 'src/harvest/services/harvest-core/dto/harvest.dto';
import { HarvestRepository } from 'src/harvest/services/harvest-core/repositories/harvest.repository';
import { AllocationRepository } from 'src/harvest/services/harvest-core/repositories/allocation.repository';
import { ClassificationRepository } from 'src/harvest/services/harvest-core/repositories/classification.repository';
import { assertFinalClassificationConsistency } from 'src/harvest/services/harvest-core/rules/harvest-validation.rules';
import { calculateHarvestFields } from 'src/harvest/services/harvest-core/utils/harvest-fields.util';
import {
  hasExplicitOwnerData,
  normalizeOwnerInputs,
} from 'src/harvest/services/harvest-core/utils/owner-fallback.util';
import { SeasonsService } from 'src/seasons/seasons.service';

@Injectable()
export class HarvestCommandService {
  constructor(
    private readonly harvestRepository: HarvestRepository,
    private readonly classificationRepository: ClassificationRepository,
    private readonly allocationRepository: AllocationRepository,
    private readonly seasonsService: SeasonsService,
  ) {}

  async create(data: FieldHarvestCreateDto, actorId: number) {
    const { id: seasonId } = await this.seasonsService.findActiveSeason();
    const dateStr = new Date(data.dateGregorian).toISOString().split('T')[0];
    const slug = `${dateStr}-f${data.fieldId}-s${seasonId}`;

    const existing = await this.harvestRepository.findBySlug(slug);
    if (existing) throw new ConflictException('A report for this field and date already exists');

    const totalHarvested = Number(data.totalHarvested) || 0;
    const totalRejected = Number(data.totalRejected) || 0;
    const normalizedOwners = normalizeOwnerInputs({
      totalHarvested,
      totalRejected,
      ownerHarvested: data.ownerHarvested,
      ownerRejected: data.ownerRejected,
    });

    const rates = calculateHarvestFields({
      totalHarvested,
      totalRejected,
      ownerHarvested: normalizedOwners.ownerHarvested,
      ownerRejected: normalizedOwners.ownerRejected,
    });

    return this.harvestRepository.create({
      ...data,
      dateGregorian: new Date(data.dateGregorian),
      updatedById: actorId,
      seasonId,
      slug,
      totalHarvested,
      totalRejected,
      ownerHarvested: normalizedOwners.ownerHarvested,
      ownerRejected: normalizedOwners.ownerRejected,
      ...rates,
    });
  }

  async update(id: number, data: Omit<FieldHarvestUpdateDto, 'id'>, actorId: number) {
    const current = await this.harvestRepository.findOneWithRelations(id);
    if (!current) {
      throw new NotFoundException(`Harvest report #${id} not found`);
    }

    const mergedData = { ...current, ...data };
    const totalHarvested = Number(mergedData.totalHarvested) || 0;
    const totalRejected = Number(mergedData.totalRejected) || 0;
    const ownerFieldsProvided = data.ownerHarvested !== undefined || data.ownerRejected !== undefined;
    const currentHasExplicitOwnerData = hasExplicitOwnerData({
      totalHarvested: current.totalHarvested,
      totalRejected: current.totalRejected,
      ownerHarvested: current.ownerHarvested,
      ownerRejected: current.ownerRejected,
      ownerAfterRejected: current.ownerAfterRejected,
      ownerRejectionRate: current.ownerRejectionRate,
    });

    const normalizedOwners = ownerFieldsProvided
      ? {
          ownerHarvested: Number(mergedData.ownerHarvested) || 0,
          ownerRejected: Number(mergedData.ownerRejected) || 0,
        }
      : currentHasExplicitOwnerData
        ? {
            ownerHarvested: Number(current.ownerHarvested) || 0,
            ownerRejected: Number(current.ownerRejected) || 0,
          }
        : {
            ownerHarvested: totalHarvested,
            ownerRejected: totalRejected,
          };

    const rates = calculateHarvestFields({
      totalHarvested,
      totalRejected,
      ownerHarvested: normalizedOwners.ownerHarvested,
      ownerRejected: normalizedOwners.ownerRejected,
      classifiedTotal: Number(mergedData.classifiedTotal) || 0,
      isPartialClassification: mergedData.isPartialClassification,
    });

    return this.harvestRepository.update(id, {
      ...data,
      updatedById: actorId,
      totalHarvested,
      totalRejected,
      ownerHarvested: normalizedOwners.ownerHarvested,
      ownerRejected: normalizedOwners.ownerRejected,
      ...rates,
    });
  }

  async updatePartialClassificationMode(id: number, isPartialClassification: boolean) {
    const harvest = await this.harvestRepository.findUniqueById(id);

    if (!harvest) {
      throw new NotFoundException(`Harvest report #${id} not found`);
    }

    assertFinalClassificationConsistency(
      harvest.classifiedTotal,
      harvest.totalAfterRejected,
      isPartialClassification,
    );

    return this.harvestRepository.update(id, { isPartialClassification });
  }

  async remove(id: number) {
    const harvest = await this.harvestRepository.findUniqueById(id);
    if (!harvest) {
      throw new NotFoundException(`Harvest report #${id} not found`);
    }

    try {
      const classificationIds = await this.classificationRepository.findIdsByHarvest(id);
      const ids = classificationIds.map((item) => item.id);

      if (ids.length > 0) {
        await this.allocationRepository.deleteCustomerAllocationsByReferenceIds(ids);
        await this.allocationRepository.deleteTraderStocksByReferenceIds(ids);
        await this.classificationRepository.deleteManyByIds(ids);
      }

      return await this.harvestRepository.delete(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'Cannot delete harvest report because related records exist in the system.',
        );
      }

      throw error;
    }
  }
}
