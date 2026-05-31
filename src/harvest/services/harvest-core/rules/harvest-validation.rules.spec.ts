import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { AssignmentType, Grade, PitamStatus } from 'src/generated/prisma';
import {
  assertClassificationsMatchHarvested,
  assertFinalClassificationConsistency,
  assertGeneralAssignmentIds,
  assertNoDuplicateClassifications,
} from 'src/harvest/services/harvest-core/rules/harvest-validation.rules';

describe('harvest-validation rules', () => {
  it('rejects duplicate classification combinations', () => {
    expect(() =>
      assertNoDuplicateClassifications([
        {
          assignmentType: AssignmentType.TRADER,
          traderId: 1,
          traderCategoryId: 10,
          pitamStatus: PitamStatus.WITH_PITAM,
          quantity: 10,
        },
        {
          assignmentType: AssignmentType.TRADER,
          traderId: 1,
          traderCategoryId: 10,
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
});
