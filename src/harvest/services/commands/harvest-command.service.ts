import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, MovementType } from '@prisma/client';
import { FieldHarvestCreateDto, FieldHarvestUpdateDto } from 'src/harvest/services/harvest-core/dto/harvest.dto';
import { HarvestRepository } from 'src/harvest/services/harvest-core/repositories/harvest.repository';
import { AllocationRepository } from 'src/harvest/services/harvest-core/repositories/allocation.repository';
import { ClassificationRepository } from 'src/harvest/services/harvest-core/repositories/classification.repository';
import {
  assertFinalClassificationConsistency,
  assertHarvestNetVsClassified,
} from 'src/harvest/services/harvest-core/rules/harvest-validation.rules';
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
    const { id: seasonId, yearName: activeSeasonYearName } = await this.seasonsService.findActiveSeason();
    const harvestYear = new Date(data.dateGregorian).getFullYear();
    if (harvestYear !== activeSeasonYearName) {
      throw new BadRequestException(
        `Harvest date year (${harvestYear}) does not match the active season year (${activeSeasonYearName})`,
      );
    }
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

    const newTotalAfterRejected = Math.max(totalHarvested - totalRejected, 0);
    const currentClassifiedTotal = Number(current.classifiedTotal) || 0;

    // Whatever the caller asks for this update takes precedence over the stale pre-edit flag —
    // otherwise a request that both shrinks net-vs-classified to an exact match and confirms
    // "mark as full classification" in the same call would still be rejected based on the old flag.
    const requestedIsPartialClassification = data.isPartialClassification ?? current.isPartialClassification;

    assertHarvestNetVsClassified(currentClassifiedTotal, newTotalAfterRejected, requestedIsPartialClassification);

    const effectiveIsPartialClassification =
      !current.isPartialClassification &&
      currentClassifiedTotal > 0 &&
      newTotalAfterRejected > currentClassifiedTotal
        ? true
        : requestedIsPartialClassification;

    const rates = calculateHarvestFields({
      totalHarvested,
      totalRejected,
      ownerHarvested: normalizedOwners.ownerHarvested,
      ownerRejected: normalizedOwners.ownerRejected,
      classifiedTotal: Number(mergedData.classifiedTotal) || 0,
      isPartialClassification: effectiveIsPartialClassification,
    });

    let dateUpdate: { dateGregorian?: Date; dateHebrew?: string; slug?: string } = {};
    if (data.dateGregorian !== undefined) {
      const season = await this.harvestRepository.findSeasonName(current.seasonId);
      const harvestYear = new Date(data.dateGregorian).getFullYear();
      if (season && harvestYear !== season.yearName) {
        throw new BadRequestException(
          `Harvest date year (${harvestYear}) does not match the season year (${season.yearName})`,
        );
      }

      const dateStr = new Date(data.dateGregorian).toISOString().split('T')[0];
      const slug = `${dateStr}-f${mergedData.fieldId}-s${current.seasonId}`;
      if (slug !== current.slug) {
        const existing = await this.harvestRepository.findBySlug(slug);
        if (existing && existing.id !== id) {
          throw new ConflictException('A report for this field and date already exists');
        }
      }

      dateUpdate = { dateGregorian: new Date(data.dateGregorian), dateHebrew: data.dateHebrew ?? current.dateHebrew, slug };
    }

    return this.harvestRepository.update(id, {
      ...data,
      updatedById: actorId,
      totalHarvested,
      totalRejected,
      ownerHarvested: normalizedOwners.ownerHarvested,
      ownerRejected: normalizedOwners.ownerRejected,
      ...rates,
      ...dateUpdate,
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

  async removeAllSortings(harvestId: number) {
    const harvest = await this.harvestRepository.findUniqueById(harvestId);
    if (!harvest) {
      throw new NotFoundException(`Harvest report #${harvestId} not found`);
    }

    const classificationIds = await this.classificationRepository.findIdsByHarvest(harvestId);
    const ids = classificationIds.map((item) => item.id);

    if (ids.length === 0) {
      return;
    }

    await this.allocationRepository.deleteCustomerAllocationsByReferenceIds(ids);
    await this.allocationRepository.deleteTraderStocksByReferenceIds(ids);
    await this.classificationRepository.deleteManyByIds(ids);
    await this.harvestRepository.update(harvestId, { classifiedTotal: 0 });
  }

  async remove(id: number) {
    const harvest = await this.harvestRepository.findUniqueById(id);
    if (!harvest) {
      throw new NotFoundException(`Harvest report #${id} not found`);
    }

    const classificationIds = await this.classificationRepository.findIdsByHarvest(id);
    if (classificationIds.length > 0) {
      throw new ConflictException(
        'Cannot delete harvest record because it has related sortings. Delete all sortings first.',
      );
    }

    try {
      const softDeletedIds = await this.classificationRepository.findAllIdsByHarvest(id);
      if (softDeletedIds.length > 0) {
        await this.classificationRepository.deleteManyByIds(softDeletedIds.map((c) => c.id));
      }
      return await this.harvestRepository.delete(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'Cannot delete harvest record because related records exist in the system.',
        );
      }

      throw error;
    }
  }
}
