import { useRef, useState } from 'react';
import type { HarvestFormClassificationDraft } from '../../harvestPage.types';
import { applyHarvestClassificationDraftUpdate, createEmptyHarvestClassificationDraft } from '../../utils/harvestPage.utils';
import { setMatrixQuantity, type PitamRowKey } from '../../utils/harvestClassificationMatrix.util';

// Generic repeatable "sorting row" draft state, shared by any form that lets a user stage new
// classification rows for a harvest (the Add-Harvest bulk form and the harvest edit dialog).
export function useHarvestClassificationDrafts() {
  const [classifications, setClassifications] = useState<HarvestFormClassificationDraft[]>([]);
  const classificationDraftCounterRef = useRef(1);

  const createNextClassificationDraft = (): HarvestFormClassificationDraft => {
    const nextId = classificationDraftCounterRef.current;
    classificationDraftCounterRef.current += 1;
    return createEmptyHarvestClassificationDraft(`draft-${nextId}`);
  };

  const addDraft = () => {
    setClassifications((previous) => [...previous, createNextClassificationDraft()]);
  };

  const removeDraft = (draftId: string) => {
    setClassifications((previous) => {
      if (previous.length <= 0) {
        return previous;
      }

      return previous.filter((draft) => draft.id !== draftId);
    });
  };

  const updateDraft = (draftId: string, updater: Partial<HarvestFormClassificationDraft>) => {
    setClassifications((previous) =>
      previous.map((draft) => {
        if (draft.id !== draftId) {
          return draft;
        }

        return applyHarvestClassificationDraftUpdate(draft, updater);
      }),
    );
  };

  const updateDraftQuantity = (draftId: string, pitamKey: PitamRowKey, gradeKey: string, value: string) => {
    setClassifications((previous) =>
      previous.map((draft) =>
        draft.id === draftId
          ? { ...draft, quantities: setMatrixQuantity(draft.quantities, pitamKey, gradeKey, value) }
          : draft,
      ),
    );
  };

  return {
    classifications,
    setClassifications,
    addDraft,
    removeDraft,
    updateDraft,
    updateDraftQuantity,
  };
}
