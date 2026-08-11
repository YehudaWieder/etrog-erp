import { openPrintableWindow } from '../../../../services/printWindow';
import type { PitamGradeCell } from '../types';

type ColumnLabels = {
  withPitam: string;
  withoutPitam: string;
  mixed: string;
};

export type DashboardSummaryPrintTable = {
  title: string;
  metaLines: string[];
  categories: string[];
  grades: string[];
  matrix: Record<string, Record<string, PitamGradeCell>>;
  categoryColumnLabel: string;
  totalColumnLabel: string;
  emptyLabel: string;
  columnLabels: ColumnLabels;
  footerLines: string[];
};

type PrintDashboardSummaryParams = {
  lang: 'he' | 'en';
  heading: string;
  tables: DashboardSummaryPrintTable[];
};

export const DASHBOARD_SUMMARY_PRINT_STYLES = `
  h2 {
    margin: 18px 0 8px;
    font-size: 16px;
    color: #1f4f29;
    break-before: page;
    page-break-before: always;
  }
  .dashboard-summary-print__meta {
    margin: 0 0 10px;
    font-size: 13px;
    color: #1f2a22;
  }
  .dashboard-summary-print__meta strong {
    color: #1f4f29;
  }
  .dashboard-summary-print__footer {
    margin: 10px 0 0;
    font-size: 12px;
    color: #2f4536;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 11px;
  }
  th,
  td {
    border: 1px solid #ccd9cf;
    padding: 5px 4px;
    text-align: center;
    word-break: break-word;
  }
  th {
    background: #1f5a32;
    color: #fff;
    font-weight: 700;
    font-size: 10.5px;
  }
  tbody tr:nth-child(even) {
    background: #f8fcf9;
  }
  tr, td, th {
    break-inside: avoid;
    page-break-inside: avoid;
  }
`;

function esc(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(n: number, locale: string): string {
  return n.toLocaleString(locale);
}

const EMPTY_CELL: PitamGradeCell = { withPitam: 0, withoutPitam: 0, mixed: 0 };

function tableHtml(table: DashboardSummaryPrintTable, locale: string): string {
  const { categories, grades, matrix, categoryColumnLabel, totalColumnLabel, emptyLabel, columnLabels } = table;

  if (categories.length === 0 || grades.length === 0) {
    return `<p>${esc(emptyLabel)}</p>`;
  }

  const cellOf = (cat: string, grade: string): PitamGradeCell => matrix[cat]?.[grade] ?? EMPTY_CELL;

  const gradeColumns: Record<string, { withPitam: boolean; withoutPitam: boolean; mixed: boolean }> = {};
  for (const grade of grades) {
    const hasWithPitam = categories.some((cat) => (matrix[cat]?.[grade]?.withPitam ?? 0) > 0);
    const hasWithoutPitam = categories.some((cat) => (matrix[cat]?.[grade]?.withoutPitam ?? 0) > 0);
    const hasMixed = categories.some((cat) => (matrix[cat]?.[grade]?.mixed ?? 0) > 0);
    gradeColumns[grade] =
      grade === 'ללא'
        ? { withPitam: hasWithPitam, withoutPitam: hasWithoutPitam, mixed: hasMixed }
        : { withPitam: true, withoutPitam: true, mixed: hasMixed };
  }

  const colSpanOf = (grade: string) => {
    const cols = gradeColumns[grade];
    return Number(cols.withPitam) + Number(cols.withoutPitam) + Number(cols.mixed);
  };

  const gradeHeadCells = grades.map((grade) => `<th colspan="${colSpanOf(grade)}">${esc(grade)}</th>`).join('');
  const subHeadCells = grades
    .map((grade) => {
      const cols = gradeColumns[grade];
      let cells = '';
      if (cols.withPitam) cells += `<th>${esc(columnLabels.withPitam)}</th>`;
      if (cols.withoutPitam) cells += `<th>${esc(columnLabels.withoutPitam)}</th>`;
      if (cols.mixed) cells += `<th>${esc(columnLabels.mixed)}</th>`;
      return cells;
    })
    .join('');

  const rowTotal = (cat: string) =>
    grades.reduce((sum, grade) => {
      const cell = cellOf(cat, grade);
      return sum + cell.withPitam + cell.withoutPitam + cell.mixed;
    }, 0);

  const bodyRows = categories
    .map((cat) => {
      const cells = grades
        .map((grade) => {
          const cols = gradeColumns[grade];
          const cell = cellOf(cat, grade);
          let out = '';
          if (cols.withPitam) out += `<td>${fmt(cell.withPitam, locale)}</td>`;
          if (cols.withoutPitam) out += `<td>${fmt(cell.withoutPitam, locale)}</td>`;
          if (cols.mixed) out += `<td>${fmt(cell.mixed, locale)}</td>`;
          return out;
        })
        .join('');
      return `<tr><th>${esc(cat)}</th>${cells}<td>${fmt(rowTotal(cat), locale)}</td></tr>`;
    })
    .join('');

  return `<table>
    <thead>
      <tr><th rowspan="2">${esc(categoryColumnLabel)}</th>${gradeHeadCells}<th rowspan="2">${esc(totalColumnLabel)}</th></tr>
      <tr>${subHeadCells}</tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>`;
}

function sectionHtml(table: DashboardSummaryPrintTable, locale: string): string {
  const metaHtml = table.metaLines.length
    ? `<p class="dashboard-summary-print__meta">${table.metaLines.map(esc).join('<br/>')}</p>`
    : '';
  const footerHtml = table.footerLines.length
    ? `<p class="dashboard-summary-print__footer">${table.footerLines.map(esc).join('<br/>')}</p>`
    : '';
  return `<h2>${esc(table.title)}</h2>${metaHtml}${tableHtml(table, locale)}${footerHtml}`;
}

export function buildDashboardSummaryHtml(lang: 'he' | 'en', tables: DashboardSummaryPrintTable[]): string {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  return tables.map((table) => sectionHtml(table, locale)).join('');
}

const STANDALONE_WINDOW_FIRST_PAGE_OVERRIDE = `
  .harvest-print__content h2:first-of-type {
    margin-top: 0;
    break-before: auto;
    page-break-before: auto;
  }
`;

export function printDashboardSummary({ lang, heading, tables }: PrintDashboardSummaryParams): void {
  const html = buildDashboardSummaryHtml(lang, tables);

  openPrintableWindow({
    title: heading,
    heading,
    html,
    direction: lang === 'he' ? 'rtl' : 'ltr',
    extraStyles: DASHBOARD_SUMMARY_PRINT_STYLES + STANDALONE_WINDOW_FIRST_PAGE_OVERRIDE,
  });
}
