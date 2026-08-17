import { sanitizeText } from 'src/common/utils/input-normalization.util';

export function normalizeIsraelFieldCategoryName(name: string): string {
  return sanitizeText(name);
}
