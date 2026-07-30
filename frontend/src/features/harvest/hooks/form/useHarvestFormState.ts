import { useRef, useState } from 'react';
import type { CustomerCategory } from '../../../../services/customerCategoriesApi';
import type { Field } from '../../../../services/fieldsApi';
import type { TraderCategoryWithShares } from '../../../../services/traderCategoriesApi';
import { formatHebrewDateFromGregorianInput } from '../../utils/harvestPage.utils';
import { useHarvestClassificationDrafts } from './useHarvestClassificationDrafts';

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
  const isOwnerHarvestedTouchedRef = useRef(false);
  const isOwnerRejectedTouchedRef = useRef(false);
  const [harvestFormIsPartialClassification, setHarvestFormIsPartialClassification] = useState(false);
  const [harvestFormUncalculatedRejected, setHarvestFormUncalculatedRejected] = useState('');
  const [harvestFormRemainsInItalyGradeH, setHarvestFormRemainsInItalyGradeH] = useState(true);
  const [harvestFormRemainsInItalyGradeV, setHarvestFormRemainsInItalyGradeV] = useState(true);
  const {
    classifications: harvestFormClassifications,
    setClassifications: setHarvestFormClassifications,
    addDraft: addHarvestClassificationDraft,
    removeDraft: removeHarvestClassificationDraft,
    updateDraft: updateHarvestClassificationDraft,
    updateDraftQuantity: updateHarvestClassificationDraftQuantity,
  } = useHarvestClassificationDrafts();
  const [harvestFormTraderCategories, setHarvestFormTraderCategories] = useState<TraderCategoryWithShares[]>([]);
  const [harvestFormCustomerCategories, setHarvestFormCustomerCategories] = useState<CustomerCategory[]>([]);

  const handleHarvestGregorianDateChange = (nextGregorianDate: string) => {
    setHarvestFormDateGregorian(nextGregorianDate);
    setHarvestFormDateHebrew(formatHebrewDateFromGregorianInput(nextGregorianDate));
  };

  const handleHarvestTotalHarvestedChange = (nextValue: string) => {
    setHarvestFormTotalHarvested(nextValue);

    if (!isOwnerHarvestedTouchedRef.current) {
      setHarvestFormOwnerHarvested(nextValue);
    }
  };

  const handleHarvestTotalRejectedChange = (nextValue: string) => {
    setHarvestFormTotalRejected(nextValue);

    if (!isOwnerRejectedTouchedRef.current) {
      setHarvestFormOwnerRejected(nextValue);
    }
  };

  const handleHarvestOwnerHarvestedChange = (nextValue: string) => {
    isOwnerHarvestedTouchedRef.current = true;
    setHarvestFormOwnerHarvested(nextValue);
  };

  const handleHarvestOwnerRejectedChange = (nextValue: string) => {
    isOwnerRejectedTouchedRef.current = true;
    setHarvestFormOwnerRejected(nextValue);
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
    setHarvestFormUncalculatedRejected('');
    setHarvestFormRemainsInItalyGradeH(true);
    setHarvestFormRemainsInItalyGradeV(true);
    setHarvestFormClassifications([]);
    isOwnerHarvestedTouchedRef.current = false;
    isOwnerRejectedTouchedRef.current = false;
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
    harvestFormUncalculatedRejected,
    setHarvestFormUncalculatedRejected,
    harvestFormRemainsInItalyGradeH,
    setHarvestFormRemainsInItalyGradeH,
    harvestFormRemainsInItalyGradeV,
    setHarvestFormRemainsInItalyGradeV,
    harvestFormClassifications,
    setHarvestFormClassifications,
    harvestFormTraderCategories,
    setHarvestFormTraderCategories,
    harvestFormCustomerCategories,
    setHarvestFormCustomerCategories,
    handleHarvestGregorianDateChange,
    handleHarvestTotalHarvestedChange,
    handleHarvestTotalRejectedChange,
    handleHarvestOwnerHarvestedChange,
    handleHarvestOwnerRejectedChange,
    handleHarvestNotesChange,
    openHarvestGlobalForm,
    closeHarvestGlobalForm,
    addHarvestClassificationDraft,
    removeHarvestClassificationDraft,
    updateHarvestClassificationDraft,
    updateHarvestClassificationDraftQuantity,
  };
}



