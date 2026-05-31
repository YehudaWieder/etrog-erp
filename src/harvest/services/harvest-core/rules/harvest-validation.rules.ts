import { BadRequestException, ConflictException } from '@nestjs/common';
import { AssignmentType } from 'src/generated/prisma';
import {
  ClassificationBulkItemDto,
  HarvestBulkCreateDto,
} from 'src/harvest/services/harvest-core/dto/harvest.dto';

export function assertNoDuplicateClassifications(items: ClassificationBulkItemDto[]) {
  const seen = new Set<string>();

  for (const item of items) {
    const key = `${item.assignmentType}|${item.traderId ?? 'null'}|${item.customerId ?? 'null'}|${item.traderCategoryId ?? 'null'}|${item.customerCategoryId ?? 'null'}|${item.grade ?? 'null'}`;
    if (seen.has(key)) {
      throw new ConflictException(
        'Duplicate classification found. Each combination of assignmentType, trader/customer, and category must be unique.',
      );
    }

    seen.add(key);
  }
}

export function assertClassificationsMatchHarvested(data: HarvestBulkCreateDto) {
  if (data.totalHarvested === undefined || data.totalHarvested === null) {
    throw new BadRequestException('totalHarvested is required for bulk classifications validation');
  }

  const totalRejected = data.totalRejected || 0;
  const netHarvested = Math.max((data.totalHarvested || 0) - totalRejected, 0);
  const classificationsTotal = data.classifications.reduce(
    (sum, item) => sum + (item.quantity || 0),
    0,
  );

  if (classificationsTotal > netHarvested) {
    throw new BadRequestException(
      `Total classifications quantity (${classificationsTotal}) cannot exceed net harvested quantity (${netHarvested})`,
    );
  }

  if (data.isPartialClassification) {
    return;
  }

  if (classificationsTotal !== netHarvested) {
    throw new BadRequestException(
      `Total classifications quantity (${classificationsTotal}) must equal net harvested quantity (${netHarvested})`,
    );
  }
}

export function assertGeneralAssignmentIds(classItem: {
  assignmentType: AssignmentType;
  traderId?: number | null;
  customerId?: number | null;
}) {
  if (classItem.assignmentType !== AssignmentType.GENERAL) {
    return;
  }

  if (classItem.traderId !== undefined && classItem.traderId !== null) {
    throw new BadRequestException(
      'traderId cannot be provided when assignmentType is GENERAL',
    );
  }

  if (classItem.customerId !== undefined && classItem.customerId !== null) {
    throw new BadRequestException(
      'customerId cannot be provided when assignmentType is GENERAL',
    );
  }
}

export function assertFinalClassificationConsistency(
  classifiedTotal: number,
  netHarvested: number,
  isPartialClassification: boolean,
) {
  if (classifiedTotal > netHarvested) {
    throw new BadRequestException(
      `Total classifications quantity (${classifiedTotal}) cannot exceed net harvested quantity (${netHarvested})`,
    );
  }

  if (!isPartialClassification && classifiedTotal !== netHarvested) {
    throw new BadRequestException(
      `Total classifications quantity (${classifiedTotal}) must equal net harvested quantity (${netHarvested}) in FINAL mode`,
    );
  }
}
