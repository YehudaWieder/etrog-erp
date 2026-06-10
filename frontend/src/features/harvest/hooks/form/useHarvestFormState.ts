import { useRef, useState } from 'react';
import type { CustomerCategory } from '../../../../services/customerCategoriesApi';
import type { Field } from '../../../../services/fieldsApi';
import type { TraderCategoryWithShares } from '../../../../services/traderCategoriesApi';
import type { HarvestFormClassificationDraft } from '../../harvestPage.types';
import {
  applyHarvestClassificationDraftUpdate,
  createEmptyHarvestClassificationDraft,
  formatHebrewDateFromGregorianInput,
} from '../../utils/harvestPage.utils';

type UseHarvestFormStateParams = {
  fieldFilterId: number | 'all';
  fields: Field[];
};

export function useHarvestFormState({
  fieldFilterId,
  fields,
}: UseHarvestFormStateParams) {
  const [isHarvestFormOpen, setIsHarvestFormOpen] = useState(false);
  const [isSubmittingHarvestForm, setIsSubmittingHarvestForm] = useState(false);
  const [harvestFormError, setHarvestFormError] = useState('');
  const [harvestFormDateGregorian, setHarvestFormDateGregorian] = useState('');
  const [harvestFormDateHebrew, setHarvestFormDateHebrew] = useState('');
  const [harvestFormFieldId, setHarvestFormFieldId] = useState('');
  const [harvestFormTotalHarvested, setHarvestFormTotalHarvested] = useState('');
  const [harvestFormTotalRejected, setHarvestFormTotalRejected] = useState('');
  const [harvestFormOwnerHarvested, setHarvestFormOwnerHarvested] = useState('');
  const [harvestFormOwnerRejected, setHarvestFormOwnerRejected] = useState('');
  const [harvestFormNotes, setHarvestFormNotes] = useState('');
  const [harvestFormIsPartialClassification, setHarvestFormIsPartialClassification] = useState(false);
  const [harvestFormClassifications, setHarvestFormClassifications] = useState<HarvestFormClassificationDraft[]>([]);
  const [harvestFormTraderCategories, setHarvestFormTraderCategories] = useState<TraderCategoryWithShares[]>([]);
  const [harvestFormCustomerCategories, setHarvestFormCustomerCategories] = useState<CustomerCategory[]>([]);

  const classificationDraftCounterRef = useRef(1);

  const createNextHarvestClassificationDraft = (): HarvestFormClassificationDraft => {
    const nextId = classificationDraftCounterRef.current;
    classificationDraftCounterRef.current += 1;
    return createEmptyHarvestClassificationDraft(`draft-${nextId}`);
  };

  const handleHarvestGregorianDateChange = (nextGregorianDate: string) => {
    setHarvestFormDateGregorian(nextGregorianDate);
    setHarvestFormDateHebrew(formatHebrewDateFromGregorianInput(nextGregorianDate));
  };

  const handleHarvestNotesChange = (nextNotes: string, textareaElement: HTMLTextAreaElement) => {
    setHarvestFormNotes(nextNotes);

    textareaElement.style.height = 'auto';
    textareaElement.style.height = `${Math.min(textareaElement.scrollHeight, 220)}px`;
  };

  const resetHarvestForm = () => {
    setHarvestFormError('');
    const localDate = new Date().toISOString().slice(0, 10);

    setHarvestFormDateGregorian(localDate);
    setHarvestFormDateHebrew(formatHebrewDateFromGregorianInput(localDate));
    setHarvestFormFieldId(
      fieldFilterId !== 'all' && Number(fieldFilterId) > 0
        ? String(fieldFilterId)
        : '',
    );
    setHarvestFormTotalHarvested('');
    setHarvestFormTotalRejected('');
    setHarvestFormOwnerHarvested('');
    setHarvestFormOwnerRejected('');
    setHarvestFormNotes('');
    setHarvestFormIsPartialClassification(false);
    setHarvestFormClassifications([]);
  };

  const openHarvestGlobalForm = () => {
    resetHarvestForm();
    setIsHarvestFormOpen(true);
  };

  const closeHarvestGlobalForm = () => {
    if (isSubmittingHarvestForm) {
      return;
    }

    setIsHarvestFormOpen(false);
    setHarvestFormError('');
  };

  const addHarvestClassificationDraft = () => {
    setHarvestFormClassifications((previous) => [...previous, createNextHarvestClassificationDraft()]);
  };

  const removeHarvestClassificationDraft = (draftId: string) => {
    setHarvestFormClassifications((previous) => {
      if (previous.length <= 0) {
        return previous;
      }

      return previous.filter((draft) => draft.id !== draftId);
    });
  };

  const updateHarvestClassificationDraft = (
    draftId: string,
    updater: Partial<HarvestFormClassificationDraft>,
  ) => {
    setHarvestFormClassifications((previous) =>
      previous.map((draft) => {
        if (draft.id !== draftId) {
          return draft;
        }

        return applyHarvestClassificationDraftUpdate(draft, updater);
      }),
    );
  };

  return {
    isHarvestFormOpen,
    setIsHarvestFormOpen,
    isSubmittingHarvestForm,
    setIsSubmittingHarvestForm,
    harvestFormError,
    setHarvestFormError,
    harvestFormDateGregorian,
    setHarvestFormDateGregorian,
    harvestFormDateHebrew,
    setHarvestFormDateHebrew,
    harvestFormFieldId,
    setHarvestFormFieldId,
    harvestFormTotalHarvested,
    setHarvestFormTotalHarvested,
    harvestFormTotalRejected,
    setHarvestFormTotalRejected,
    harvestFormOwnerHarvested,
    setHarvestFormOwnerHarvested,
    harvestFormOwnerRejected,
    setHarvestFormOwnerRejected,
    harvestFormNotes,
    setHarvestFormNotes,
    harvestFormIsPartialClassification,
    setHarvestFormIsPartialClassification,
    harvestFormClassifications,
    setHarvestFormClassifications,
    harvestFormTraderCategories,
    setHarvestFormTraderCategories,
    harvestFormCustomerCategories,
    setHarvestFormCustomerCategories,
    handleHarvestGregorianDateChange,
    handleHarvestNotesChange,
    openHarvestGlobalForm,
    closeHarvestGlobalForm,
    addHarvestClassificationDraft,
    removeHarvestClassificationDraft,
    updateHarvestClassificationDraft,
  };
}



