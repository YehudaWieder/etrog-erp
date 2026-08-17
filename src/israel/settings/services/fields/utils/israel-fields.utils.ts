import { sanitizeText } from 'src/common/utils/input-normalization.util';

export function normalizeIsraelFieldName(name: string): string {
  return sanitizeText(name);
}
