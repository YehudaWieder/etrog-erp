import { sanitizeText } from 'src/common/utils/input-normalization.util';

export function normalizeIsraelSortCategoryName(name: string): string {
  return sanitizeText(name);
}
