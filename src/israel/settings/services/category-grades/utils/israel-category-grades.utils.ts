import { BadRequestException } from '@nestjs/common';

export function normalizeGradesMap(grades: unknown): Record<string, string> {
  if (typeof grades !== 'object' || grades === null || Array.isArray(grades)) {
    throw new BadRequestException('Grades must be an object of key/value pairs.');
  }

  const entries = Object.entries(grades as Record<string, unknown>);
  if (entries.length === 0) {
    throw new BadRequestException('At least one grade is required.');
  }

  const normalized: Record<string, string> = {};

  for (const [key, value] of entries) {
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      throw new BadRequestException('Grade key cannot be empty.');
    }

    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException('Grade display name cannot be empty.');
    }

    if (normalized[trimmedKey] !== undefined) {
      throw new BadRequestException(`Duplicate grade key "${trimmedKey}".`);
    }

    normalized[trimmedKey] = value.trim();
  }

  return normalized;
}
