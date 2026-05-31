import { BadRequestException } from '@nestjs/common';

export function throwClassificationMutationGuardError(operation: 'create' | 'update' | 'delete'): never {
  if (operation === 'create') {
    throw new BadRequestException(
      'Classification create is centralized under harvest workflow. Use POST /harvests/classifications with body-based harvestId and isPartialClassification.',
    );
  }

  if (operation === 'update') {
    throw new BadRequestException(
      'Classification update is centralized under harvest workflow. Use PATCH /harvests/classifications with body-based harvestId, classificationId, and isPartialClassification.',
    );
  }

  throw new BadRequestException(
    'Classification delete is centralized under harvest workflow. Use DELETE /harvests/classifications with body-based harvestId, classificationId, and isPartialClassification.',
  );
}
