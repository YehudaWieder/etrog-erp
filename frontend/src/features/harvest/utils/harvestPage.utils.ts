import type { ClassificationDailySummaryCategory } from '../../../services/classificationsApi';
import type {
  FieldReportNumericColumnKey,
  HarvestFormClassificationDraft,
  HarvestNumericColumnKey,
  SortingAssignmentFilter,
  SortingDailyNumericColumnKey,
} from '../harvestPage.types';

export const DEFAULT_SIDEBAR_ITEM_ID = 'harvest-daily-details';
export const HARVEST_DAILY_FILTER_SCOPE = 'harvest-daily-details';

export const HARVEST_NUMERIC_COLUMNS: HarvestNumericColumnKey[] = [
  'totalHarvested',
  'totalRejected',
  'totalAfterRejected',
  'classifiedTotal',
];

export const FIELD_REPORT_NUMERIC_COLUMNS: FieldReportNumericColumnKey[] = [
  'totalHarvested',
  'totalRejected',
  'totalAfterRejected',
  'rejectionRate',
];

export const SORTING_DAILY_NUMERIC_COLUMNS: SortingDailyNumericColumnKey[] = ['totalSorted'];

export function parseSeasonFilterId(value: string): number | null {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

export function parseFieldFilterId(value: string): number | 'all' {
  if (value === 'all') {
    return 'all';
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 'all';
}

export function parseSortingAssignmentFilter(value: string): SortingAssignmentFilter {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'all' || normalized === 'trader' || normalized === 'customer') {
    return normalized;
  }

  if (normalized.startsWith('trader:') || normalized.startsWith('customer:')) {
    return normalized as SortingAssignmentFilter;
  }

  if (normalized === 'general') {
    return 'all';
  }

  return 'all';
}

export function buildSortingCategoryDisplayLabel(
  category: ClassificationDailySummaryCategory,
  lang: 'he' | 'en',
): string {
  if (!category.ownerType && !category.categoryName) {
    return category.label;
  }

  const defaultGeneralLabel = lang === 'he' ? 'כללי' : 'General';
  const ownerName = category.ownerName?.trim();
  const categoryLabel = category.categoryName?.trim() || category.label;

  if (category.ownerType === 'GENERAL') {
    return categoryLabel;
  }

  const ownerLabel = ownerName && ownerName.length > 0 ? ownerName : defaultGeneralLabel;

  return `${ownerLabel} | ${categoryLabel}`;
}

function normalizeSortingAssignmentName(value: string | undefined | null, lang: 'he' | 'en') {
  return (value ?? '').trim().toLocaleLowerCase(lang === 'he' ? 'he' : 'en');
}

export function resolveSortingCategoryOwnerToken(category: ClassificationDailySummaryCategory): string {
  return (category.key.split('|')[0] ?? 'general').trim().toLowerCase();
}

export function resolveSortingCategoryOwnerType(
  category: ClassificationDailySummaryCategory,
): 'GENERAL' | 'TRADER' | 'CUSTOMER' {
  if (category.ownerType === 'GENERAL' || category.ownerType === 'TRADER' || category.ownerType === 'CUSTOMER') {
    return category.ownerType;
  }

  const ownerToken = resolveSortingCategoryOwnerToken(category);
  if (ownerToken.startsWith('trader:')) {
    return 'TRADER';
  }
  if (ownerToken.startsWith('customer:')) {
    return 'CUSTOMER';
  }
  return 'GENERAL';
}

export function matchesSortingAssignmentSelection(params: {
  sortingAssignmentFilter: SortingAssignmentFilter;
  ownerType: 'GENERAL' | 'TRADER' | 'CUSTOMER';
  ownerName?: string | null;
  ownerToken?: string | null;
  traderNameById: Map<string, string>;
  customerNameById: Map<string, string>;
  lang: 'he' | 'en';
}): boolean {
  const {
    sortingAssignmentFilter,
    ownerType,
    ownerName,
    ownerToken,
    traderNameById,
    customerNameById,
    lang,
  } = params;

  if (sortingAssignmentFilter === 'all') {
    return true;
  }

  if (sortingAssignmentFilter === 'trader') {
    return ownerType === 'TRADER';
  }

  if (sortingAssignmentFilter === 'customer') {
    return ownerType === 'CUSTOMER';
  }

  if (sortingAssignmentFilter.startsWith('trader:')) {
    if (ownerType !== 'TRADER') {
      return false;
    }

    const selectedId = sortingAssignmentFilter.slice('trader:'.length);
    const normalizedOwnerToken = (ownerToken ?? '').trim().toLowerCase();
    if (normalizedOwnerToken === sortingAssignmentFilter) {
      return true;
    }

    const selectedName = traderNameById.get(selectedId);
    if (!selectedName) {
      return false;
    }

    return normalizeSortingAssignmentName(ownerName, lang) === normalizeSortingAssignmentName(selectedName, lang);
  }

  if (ownerType !== 'CUSTOMER') {
    return false;
  }

  const selectedId = sortingAssignmentFilter.slice('customer:'.length);
  const normalizedOwnerToken = (ownerToken ?? '').trim().toLowerCase();
  if (normalizedOwnerToken === sortingAssignmentFilter) {
    return true;
  }

  const selectedName = customerNameById.get(selectedId);
  if (!selectedName) {
    return false;
  }

  return normalizeSortingAssignmentName(ownerName, lang) === normalizeSortingAssignmentName(selectedName, lang);
}

export function createEmptyHarvestClassificationDraft(id: string): HarvestFormClassificationDraft {
  return {
    id,
    assignmentType: 'GENERAL',
    traderId: '',
    customerId: '',
    traderCategoryId: '',
    customerCategoryId: '',
    grade: '',
    pitamStatus: 'WITH_PITAM',
    quantity: '',
    notes: '',
  };
}

export function applyHarvestClassificationDraftUpdate(
  draft: HarvestFormClassificationDraft,
  updater: Partial<HarvestFormClassificationDraft>,
): HarvestFormClassificationDraft {
  const nextDraft = {
    ...draft,
    ...updater,
  };

  if (updater.assignmentType === 'GENERAL') {
    nextDraft.traderId = '';
    nextDraft.customerId = '';
    nextDraft.customerCategoryId = '';
  }

  if (updater.assignmentType === 'TRADER') {
    nextDraft.customerId = '';
    nextDraft.customerCategoryId = '';
  }

  if (updater.assignmentType === 'CUSTOMER') {
    nextDraft.traderId = '';
    nextDraft.traderCategoryId = '';
    nextDraft.grade = '';
  }

  if (updater.customerId !== undefined) {
    nextDraft.customerCategoryId = '';
  }

  return nextDraft;
}

export function formatHebrewDateFromGregorianInput(gregorianInput: string): string {
  if (!gregorianInput) {
    return '';
  }

  const hebrewCalendarFormatter = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formatHebrewNumber = (value: number) => {
    const normalizedValue = value >= 5000 ? value % 1000 : value;

    if (normalizedValue <= 0) {
      return String(value);
    }

    const parts: string[] = [];
    let remaining = normalizedValue;

    while (remaining >= 400) {
      parts.push('ת');
      remaining -= 400;
    }

    const hundreds = [
      { value: 300, symbol: 'ש' },
      { value: 200, symbol: 'ר' },
      { value: 100, symbol: 'ק' },
    ];

    for (const { value: partValue, symbol } of hundreds) {
      if (remaining >= partValue) {
        parts.push(symbol);
        remaining -= partValue;
      }
    }

    if (remaining === 15) {
      parts.push('טו');
      remaining = 0;
    } else if (remaining === 16) {
      parts.push('טז');
      remaining = 0;
    }

    const tens = [
      { value: 90, symbol: 'צ' },
      { value: 80, symbol: 'פ' },
      { value: 70, symbol: 'ע' },
      { value: 60, symbol: 'ס' },
      { value: 50, symbol: 'נ' },
      { value: 40, symbol: 'מ' },
      { value: 30, symbol: 'ל' },
      { value: 20, symbol: 'כ' },
      { value: 10, symbol: 'י' },
    ];

    for (const { value: partValue, symbol } of tens) {
      if (remaining >= partValue) {
        parts.push(symbol);
        remaining -= partValue;
      }
    }

    const ones = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];

    if (remaining > 0) {
      parts.push(ones[remaining - 1]);
    }

    return parts.join('');
  };

  const parsedDate = new Date(`${gregorianInput}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  const parts = hebrewCalendarFormatter.formatToParts(parsedDate);
  const dayPart = parts.find((part) => part.type === 'day')?.value;
  const monthPart = parts.find((part) => part.type === 'month')?.value;
  const yearPart = parts.find((part) => part.type === 'year')?.value;

  const dayNumber = dayPart ? Number(dayPart.replace(/\D/g, '')) : Number.NaN;
  const yearNumber = yearPart ? Number(yearPart.replace(/\D/g, '')) : Number.NaN;

  if (!monthPart || Number.isNaN(dayNumber) || Number.isNaN(yearNumber)) {
    return hebrewCalendarFormatter.format(parsedDate);
  }

  return `${formatHebrewNumber(dayNumber)} ${monthPart} ${formatHebrewNumber(yearNumber)}`;
}
