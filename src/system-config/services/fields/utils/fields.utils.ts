import { sanitizeText } from 'src/common/utils/input-normalization.util';

export function normalizeFieldName(name: string): string {
  return sanitizeText(name);
}

export function createFieldSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}
