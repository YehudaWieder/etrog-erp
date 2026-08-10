import { BadRequestException } from '@nestjs/common';
import { Grade } from '@prisma/client';

export type GradeGroup = {
  name: string;
  grades: Grade[];
};

export function validateGradeGroups(
  gradeGroups: GradeGroup[] | undefined,
  supportedGrades: Grade[],
): void {
  if (!gradeGroups || gradeGroups.length === 0) {
    return;
  }

  const supportedSet = new Set(supportedGrades);
  const seenGrades = new Set<Grade>();

  for (const group of gradeGroups) {
    if (!group.name?.trim()) {
      throw new BadRequestException('Each grade group must have a non-empty name.');
    }

    for (const grade of group.grades) {
      if (!supportedSet.has(grade)) {
        throw new BadRequestException(
          `Grade "${grade}" in group "${group.name}" is not in the category's supported grades.`,
        );
      }

      if (seenGrades.has(grade)) {
        throw new BadRequestException(
          `Grade "${grade}" cannot belong to more than one grade group.`,
        );
      }

      seenGrades.add(grade);
    }
  }
}
