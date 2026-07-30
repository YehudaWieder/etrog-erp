import type { HarvestI18n } from '../i18n';

const EXCEED_PATTERN = /^Total classifications quantity \((\d+)\) cannot exceed net harvested quantity \((\d+)\)/;
const MUST_EQUAL_FINAL_PATTERN = /^Total classifications quantity \((\d+)\) must equal net harvested quantity \((\d+)\) in FINAL mode/;
const MUST_EQUAL_PATTERN = /^Total classifications quantity \((\d+)\) must equal net harvested quantity \((\d+)\)$/;
const HARVEST_YEAR_MISMATCH_PATTERN = /^Harvest date year \((\d+)\) does not match the active season year \((\d+)\)/;
const UNCALCULATED_REJECTED_EXCEEDS_TOTAL_PATTERN = /^Uncalculated rejected \((\d+)\) cannot exceed total rejected \((\d+)\)/;

export function translateHarvestApiError(
  message: string,
  t: HarvestI18n['formSubmission'],
): string {
  let match = EXCEED_PATTERN.exec(message);
  if (match) {
    return t.apiClassificationsExceedNet(Number(match[1]), Number(match[2]));
  }

  match = MUST_EQUAL_FINAL_PATTERN.exec(message);
  if (match) {
    return t.apiClassificationsMustEqualNetFinal(Number(match[1]), Number(match[2]));
  }

  match = MUST_EQUAL_PATTERN.exec(message);
  if (match) {
    return t.apiClassificationsMustEqualNet(Number(match[1]), Number(match[2]));
  }

  match = HARVEST_YEAR_MISMATCH_PATTERN.exec(message);
  if (match) {
    return t.apiHarvestYearMismatch(Number(match[1]), Number(match[2]));
  }

  if (message.startsWith('Duplicate classification found')) {
    return t.apiDuplicateClassification;
  }

  match = UNCALCULATED_REJECTED_EXCEEDS_TOTAL_PATTERN.exec(message);
  if (match) {
    return t.uncalculatedRejectedExceedsTotal(Number(match[1]), Number(match[2]));
  }

  return message;
}
