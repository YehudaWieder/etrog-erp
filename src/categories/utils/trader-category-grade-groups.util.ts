import { BadRequestException } from '@nestjs/common';

// Generic over the grade type so Italy/trader-category callers can keep the fixed `Grade` enum
// checked at compile time (GradeGroup<Grade>), while Israel sort categories — which support
// free-text custom grades — use the string default.
export type GradeGroup<TGrade extends string = string> = {
  name: string;
  grades: TGrade[];
};

export function validateGradeGroups<TGrade extends string>(
  gradeGroups: GradeGroup<TGrade>[] | undefined,
  supportedGrades: TGrade[],
): void {
  if (!gradeGroups || gradeGroups.length === 0) {
    return;
  }

  const supportedSet = new Set(supportedGrades);
  const seenGrades = new Set<TGrade>();

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
