export function parseOptionalInt(value?: string): number | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}
