import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { AssignmentType, Grade, PitamStatus } from 'src/generated/prisma';
import {
  assertClassificationsMatchHarvested,
  assertFinalClassificationConsistency,
  assertGeneralAssignmentIds,
  assertHarvestNetVsClassified,
  assertNoDuplicateClassifications,
  assertPartialClassificationNetExceedsClassified,
} from 'src/harvest/services/harvest-core/rules/harvest-validation.rules';

describe('harvest-validation rules', () => {
  it('rejects duplicate classification combinations', () => {
    expect(() =>
      assertNoDuplicateClassifications([
        {
          assignmentType: AssignmentType.TRADER,
          traderId: 1,
          traderCategoryId: 10,
          grade: Grade.א,
          pitamStatus: PitamStatus.WITH_PITAM,
          quantity: 10,
        },
        {
          assignmentType: AssignmentType.TRADER,
          traderId: 1,
          traderCategoryId: 10,
          grade: Grade.א,
          pitamStatus: PitamStatus.WITH_PITAM,
          quantity: 5,
        },
      ]),
    ).toThrow(ConflictException);
  });

  it('enforces FINAL mode total equality', () => {
    expect(() =>
      assertClassificationsMatchHarvested({
        dateGregorian: new Date().toISOString(),
        dateHebrew: 'test',
        fieldId: 1,
        totalHarvested: 100,
        totalRejected: 10,
        isPartialClassification: false,
        classifications: [
          {
            assignmentType: AssignmentType.GENERAL,
            traderCategoryId: 1,
            grade: Grade.א,
            pitamStatus: PitamStatus.WITH_PITAM,
            quantity: 80,
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('allows empty classifications array when provided', () => {
    expect(() =>
      assertClassificationsMatchHarvested({
        dateGregorian: new Date().toISOString(),
        dateHebrew: 'test',
        fieldId: 1,
        totalHarvested: 0,
        totalRejected: 0,
        isPartialClassification: false,
        classifications: [],
      }),
    ).not.toThrow();
  });

  it('rejects trader/customer IDs on GENERAL assignment', () => {
    expect(() =>
      assertGeneralAssignmentIds({
        assignmentType: AssignmentType.GENERAL,
        traderId: 7,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects non-partial mismatched classification consistency', () => {
    expect(() => assertFinalClassificationConsistency(9, 10, false)).toThrow(BadRequestException);
    expect(() => assertFinalClassificationConsistency(10, 10, false)).not.toThrow();
  });

  describe('assertPartialClassificationNetExceedsClassified', () => {
    it('passes when classifiedTotal is 0 (no sortings)', () => {
      expect(() => assertPartialClassificationNetExceedsClassified(0, 100)).not.toThrow();
    });

    it('passes when net exceeds classifiedTotal by at least 1', () => {
      expect(() => assertPartialClassificationNetExceedsClassified(50, 51)).not.toThrow();
      expect(() => assertPartialClassificationNetExceedsClassified(50, 100)).not.toThrow();
    });

    it('rejects when net equals classifiedTotal (partial mode requires net > classified)', () => {
      expect(() => assertPartialClassificationNetExceedsClassified(100, 100)).toThrow(BadRequestException);
    });

    it('rejects when net is below classifiedTotal', () => {
      expect(() => assertPartialClassificationNetExceedsClassified(100, 80)).toThrow(BadRequestException);
      expect(() => assertPartialClassificationNetExceedsClassified(100, 0)).toThrow(BadRequestException);
    });

    it('is not called when harvest was full classification — net increase is handled by auto-switch to partial', () => {
      // assertPartialClassificationNetExceedsClassified is only called when isPartialClassification===true
      // so this function should never receive a case from a full-classification harvest
      // The command service handles the auto-switch before reaching this check
      expect(() => assertPartialClassificationNetExceedsClassified(100, 101)).not.toThrow();
    });
  });

  describe('assertHarvestNetVsClassified', () => {
    it('passes when classifiedTotal is 0', () => {
      expect(() => assertHarvestNetVsClassified(0, 50, false)).not.toThrow();
      expect(() => assertHarvestNetVsClassified(0, 50, true)).not.toThrow();
    });

    it('rejects net below classified for FULL classification harvest', () => {
      expect(() => assertHarvestNetVsClassified(1900, 1800, false)).toThrow(BadRequestException);
      expect(() => assertHarvestNetVsClassified(1900, 0, false)).toThrow(BadRequestException);
    });

    it('allows net equal to classified for FULL classification harvest', () => {
      expect(() => assertHarvestNetVsClassified(1900, 1900, false)).not.toThrow();
    });

    it('allows net above classified for FULL classification harvest (will auto-switch to partial)', () => {
      expect(() => assertHarvestNetVsClassified(1900, 2000, false)).not.toThrow();
    });

    it('rejects net below classified for PARTIAL classification harvest', () => {
      expect(() => assertHarvestNetVsClassified(100, 80, true)).toThrow(BadRequestException);
    });

    it('rejects net equal to classified for PARTIAL classification harvest', () => {
      expect(() => assertHarvestNetVsClassified(100, 100, true)).toThrow(BadRequestException);
    });

    it('allows net above classified for PARTIAL classification harvest', () => {
      expect(() => assertHarvestNetVsClassified(100, 101, true)).not.toThrow();
    });
  });
});
