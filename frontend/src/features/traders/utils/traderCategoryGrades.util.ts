export const TRADER_CATEGORY_GRADE_OPTIONS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ללא'] as const;

export type TraderCategoryGradeOption = (typeof TRADER_CATEGORY_GRADE_OPTIONS)[number];

export function toggleGradeSelection(
  selectedGrades: string[],
  grade: string,
): string[] {
  return selectedGrades.includes(grade)
    ? selectedGrades.filter((item) => item !== grade)
    : [...selectedGrades, grade];
}
