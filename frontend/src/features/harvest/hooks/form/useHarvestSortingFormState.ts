import { useState } from 'react';

export function useHarvestSortingFormState() {
  const [isHarvestSortingFormOpen, setIsHarvestSortingFormOpen] = useState(false);
  const [isSubmittingHarvestSortingForm, setIsSubmittingHarvestSortingForm] = useState(false);
  const [harvestSortingFormError, setHarvestSortingFormError] = useState('');
  const [harvestSortingFormHarvestId, setHarvestSortingFormHarvestId] = useState('');
  const [harvestSortingFormAssignmentType, setHarvestSortingFormAssignmentType] = useState<'GENERAL' | 'TRADER' | 'CUSTOMER'>('GENERAL');
  const [harvestSortingFormTraderId, setHarvestSortingFormTraderId] = useState('');
  const [harvestSortingFormCustomerId, setHarvestSortingFormCustomerId] = useState('');
  const [harvestSortingFormTraderCategoryId, setHarvestSortingFormTraderCategoryId] = useState('');
  const [harvestSortingFormCustomerCategoryId, setHarvestSortingFormCustomerCategoryId] = useState('');
  const [harvestSortingFormGrade, setHarvestSortingFormGrade] = useState('');
  const [harvestSortingFormPitamStatus, setHarvestSortingFormPitamStatus] = useState<'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED'>('WITH_PITAM');
  const [harvestSortingFormQuantity, setHarvestSortingFormQuantity] = useState('');
  const [harvestSortingFormNotes, setHarvestSortingFormNotes] = useState('');
  const [harvestSortingFormIsPartialClassification, setHarvestSortingFormIsPartialClassification] = useState(false);

  const resetHarvestSortingForm = (initialHarvestId: number | null = null) => {
    const nextHarvestId = initialHarvestId !== null ? String(initialHarvestId) : '';

    setHarvestSortingFormError('');
    setHarvestSortingFormHarvestId(nextHarvestId);
    setHarvestSortingFormAssignmentType('GENERAL');
    setHarvestSortingFormTraderId('');
    setHarvestSortingFormCustomerId('');
    setHarvestSortingFormTraderCategoryId('');
    setHarvestSortingFormCustomerCategoryId('');
    setHarvestSortingFormGrade('');
    setHarvestSortingFormPitamStatus('WITH_PITAM');
    setHarvestSortingFormQuantity('');
    setHarvestSortingFormNotes('');
    setHarvestSortingFormIsPartialClassification(false);
  };

  const openHarvestSortingGlobalForm = (initialHarvestId: number | null = null) => {
    resetHarvestSortingForm(initialHarvestId);
    setIsHarvestSortingFormOpen(true);
  };

  const closeHarvestSortingGlobalForm = () => {
    if (isSubmittingHarvestSortingForm) {
      return;
    }

    setIsHarvestSortingFormOpen(false);
    setHarvestSortingFormError('');
  };

  const handleHarvestSortingAssignmentTypeChange = (nextAssignmentType: 'GENERAL' | 'TRADER' | 'CUSTOMER') => {
    setHarvestSortingFormAssignmentType(nextAssignmentType);
    setHarvestSortingFormTraderId('');
    setHarvestSortingFormCustomerId('');
    setHarvestSortingFormTraderCategoryId('');
    setHarvestSortingFormCustomerCategoryId('');
    setHarvestSortingFormGrade('');
  };

  const handleHarvestSortingCustomerIdChange = (nextCustomerId: string) => {
    setHarvestSortingFormCustomerId(nextCustomerId);
    setHarvestSortingFormCustomerCategoryId('');
  };

  const handleHarvestSortingNotesChange = (nextNotes: string, textareaElement: HTMLTextAreaElement) => {
    setHarvestSortingFormNotes(nextNotes);

    textareaElement.style.height = 'auto';
    textareaElement.style.height = `${Math.min(textareaElement.scrollHeight, 220)}px`;
  };

  return {
    isHarvestSortingFormOpen,
    setIsHarvestSortingFormOpen,
    isSubmittingHarvestSortingForm,
    setIsSubmittingHarvestSortingForm,
    harvestSortingFormError,
    setHarvestSortingFormError,
    harvestSortingFormHarvestId,
    setHarvestSortingFormHarvestId,
    harvestSortingFormAssignmentType,
    handleHarvestSortingAssignmentTypeChange,
    setHarvestSortingFormAssignmentType,
    harvestSortingFormTraderId,
    setHarvestSortingFormTraderId,
    harvestSortingFormCustomerId,
    setHarvestSortingFormCustomerId,
    handleHarvestSortingCustomerIdChange,
    harvestSortingFormTraderCategoryId,
    setHarvestSortingFormTraderCategoryId,
    harvestSortingFormCustomerCategoryId,
    setHarvestSortingFormCustomerCategoryId,
    harvestSortingFormGrade,
    setHarvestSortingFormGrade,
    harvestSortingFormPitamStatus,
    setHarvestSortingFormPitamStatus,
    harvestSortingFormQuantity,
    setHarvestSortingFormQuantity,
    harvestSortingFormNotes,
    setHarvestSortingFormNotes,
    handleHarvestSortingNotesChange,
    harvestSortingFormIsPartialClassification,
    setHarvestSortingFormIsPartialClassification,
    openHarvestSortingGlobalForm,
    closeHarvestSortingGlobalForm,
  };
}