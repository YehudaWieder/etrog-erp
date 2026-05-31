export const MIN_SEASON_YEAR = 2020;
export const MAX_SEASON_YEAR = 2100;

export function isSeasonYearInAllowedRange(value: string): boolean {
  const parsedYear = Number(value);

  return Number.isInteger(parsedYear) && parsedYear >= MIN_SEASON_YEAR && parsedYear <= MAX_SEASON_YEAR;
}

export function toSeasonFailureMessage(
  payload: unknown,
  errorMessage: string | undefined,
  fallbackMessage: string,
): string {
  if (typeof payload === 'string' && payload) {
    return payload;
  }

  if (errorMessage) {
    return errorMessage;
  }

  return fallbackMessage;
}
