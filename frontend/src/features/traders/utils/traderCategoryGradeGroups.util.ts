import type { GradeGroup } from '../../../services/traderCategoriesApi';

export type GradeGroupRow = {
  localId: number;
  name: string;
  grades: string[];
};

export function gradeGroupsToRows(gradeGroups: GradeGroup[] | undefined): GradeGroupRow[] {
  return (gradeGroups ?? []).map((group, index) => ({
    localId: index + 1,
    name: group.name,
    grades: group.grades,
  }));
}

export function rowsToGradeGroups(rows: GradeGroupRow[]): GradeGroup[] {
  return rows.map(({ name, grades }) => ({ name, grades }));
}

export function getNextGradeGroupRowId(rows: GradeGroupRow[]): number {
  return rows.reduce((max, row) => Math.max(max, row.localId), 0) + 1;
}

export function addGradeGroupRow(rows: GradeGroupRow[]): GradeGroupRow[] {
  return [...rows, { localId: getNextGradeGroupRowId(rows), name: '', grades: [] }];
}

export function removeGradeGroupRow(rows: GradeGroupRow[], localId: number): GradeGroupRow[] {
  return rows.filter((row) => row.localId !== localId);
}

export function renameGradeGroupRow(rows: GradeGroupRow[], localId: number, name: string): GradeGroupRow[] {
  return rows.map((row) => (row.localId === localId ? { ...row, name } : row));
}

// A grade may belong to at most one group; selecting it in a group removes it from any other group.
export function toggleGradeInGroupRow(rows: GradeGroupRow[], localId: number, grade: string): GradeGroupRow[] {
  return rows.map((row) => {
    if (row.localId === localId) {
      const grades = row.grades.includes(grade)
        ? row.grades.filter((item) => item !== grade)
        : [...row.grades, grade];
      return { ...row, grades };
    }

    if (row.grades.includes(grade)) {
      return { ...row, grades: row.grades.filter((item) => item !== grade) };
    }

    return row;
  });
}
