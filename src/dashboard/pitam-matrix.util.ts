export type PitamGradeCell = { withPitam: number; withoutPitam: number; mixed: number };
export type PitamStatusLike = 'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED';
export type PitamMatrix = Map<string, Map<string, PitamGradeCell>>;

export const GRADE_ORDER = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ללא'];

export function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

export function addToPitamMatrix(matrix: PitamMatrix, cat: string, grade: string, pitamStatus: PitamStatusLike, quantity: number) {
  if (!matrix.has(cat)) matrix.set(cat, new Map());
  const row = matrix.get(cat)!;
  if (!row.has(grade)) row.set(grade, { withPitam: 0, withoutPitam: 0, mixed: 0 });
  const cell = row.get(grade)!;
  if (pitamStatus === 'WITH_PITAM') cell.withPitam += quantity;
  else if (pitamStatus === 'WITHOUT_PITAM') cell.withoutPitam += quantity;
  else cell.mixed += quantity;
}

export function flattenPitamMatrix(matrix: PitamMatrix): Record<string, Record<string, PitamGradeCell>> {
  const result: Record<string, Record<string, PitamGradeCell>> = {};
  for (const [cat, row] of matrix.entries()) {
    result[cat] = Object.fromEntries(row);
  }
  return result;
}

export function gradesUsedIn(matrix: PitamMatrix): string[] {
  const used = new Set<string>();
  for (const row of matrix.values()) {
    for (const g of row.keys()) used.add(g);
  }
  const known = GRADE_ORDER.filter((g) => used.has(g));
  const extra = [...used]
    .filter((g) => !GRADE_ORDER.includes(g))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
  return [...known, ...extra];
}

// Category rows must follow the priority order configured in category settings (orderIndex),
// not the order categories happened to first appear in the underlying query results.
export function categoriesUsedIn(matrix: PitamMatrix, categoryOrder: string[]): string[] {
  const usedSet = new Set(matrix.keys());
  const ordered = categoryOrder.filter((c) => usedSet.has(c));
  const unordered = Array.from(usedSet).filter((c) => !categoryOrder.includes(c));
  return [...ordered, ...unordered];
}
