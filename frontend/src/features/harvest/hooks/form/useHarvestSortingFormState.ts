import { useState } from 'react';
import type { ClassificationListRecord } from '../../../../services/classificationsApi';

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
  const [harvestSortingFormPitamStatus, setHarvestSortingFormPitamStatus] = useState<'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED' | ''>('');
  const [harvestSortingFormQuantity, setHarvestSortingFormQuantity] = useState('');
  const [harvestSortingFormNotes, setHarvestSortingFormNotes] = useState('');
  const [harvestSortingFormIsPartialClassification, setHarvestSortingFormIsPartialClassification] = useState(false);
  const [isAddingRejectedQuantity, setIsAddingRejectedQuantity] = useState(false);
  const [harvestSortingFormAdditionalRejected, setHarvestSortingFormAdditionalRejected] = useState('');
  const [isAddingOwnerRejectedQuantity, setIsAddingOwnerRejectedQuantity] = useState(false);
  const [harvestSortingFormAdditionalOwnerRejected, setHarvestSortingFormAdditionalOwnerRejected] = useState('');
  const [harvestSortingFormTotalHarvested, setHarvestSortingFormTotalHarvested] = useState('');
  const [harvestSortingFormOwnerHarvested, setHarvestSortingFormOwnerHarvested] = useState('');

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
    setHarvestSortingFormPitamStatus('');
    setHarvestSortingFormQuantity('');
    setHarvestSortingFormNotes('');
    setHarvestSortingFormIsPartialClassification(false);
    setIsAddingRejectedQuantity(false);
    setHarvestSortingFormAdditionalRejected('');
    setIsAddingOwnerRejectedQuantity(false);
    setHarvestSortingFormAdditionalOwnerRejected('');
    setHarvestSortingFormTotalHarvested('');
    setHarvestSortingFormOwnerHarvested('');
  };

  const openAddRejectedQuantity = () => {
    setIsAddingRejectedQuantity(true);
  };

  const removeAddedRejectedQuantity = () => {
    setIsAddingRejectedQuantity(false);
    setHarvestSortingFormAdditionalRejected('');
  };

  const openAddOwnerRejectedQuantity = () => {
    setIsAddingOwnerRejectedQuantity(true);
  };

  const removeAddedOwnerRejectedQuantity = () => {
    setIsAddingOwnerRejectedQuantity(false);
    setHarvestSortingFormAdditionalOwnerRejected('');
  };

  const openHarvestSortingGlobalForm = (initialHarvestId: number | null = null) => {
    resetHarvestSortingForm(initialHarvestId);
    setIsHarvestSortingFormOpen(true);
  };

  const prefillSortingFormForRestore = (row: ClassificationListRecord) => {
    setHarvestSortingFormError('');
    setHarvestSortingFormHarvestId(row.fieldHarvest ? String(row.fieldHarvest.id) : '');
    setHarvestSortingFormAssignmentType(
      row.assignmentType === 'TRADER' ? 'TRADER' :
      row.assignmentType === 'CUSTOMER' ? 'CUSTOMER' : 'GENERAL',
    );
    setHarvestSortingFormTraderId(row.traderId ? String(row.traderId) : '');
    setHarvestSortingFormCustomerId(row.customerId ? String(row.customerId) : '');
    setHarvestSortingFormTraderCategoryId(row.traderCategoryId ? String(row.traderCategoryId) : '');
    setHarvestSortingFormCustomerCategoryId(row.customerCategoryId ? String(row.customerCategoryId) : '');
    setHarvestSortingFormGrade(row.grade ?? '');
    setHarvestSortingFormPitamStatus(
      row.pitamStatus === 'WITH_PITAM' || row.pitamStatus === 'WITHOUT_PITAM' || row.pitamStatus === 'MIXED'
        ? row.pitamStatus
        : '',
    );
    setHarvestSortingFormQuantity(String(row.quantity));
    setHarvestSortingFormNotes(row.notes ?? '');
    setHarvestSortingFormIsPartialClassification(row.fieldHarvest?.isPartialClassification ?? false);
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
    isAddingRejectedQuantity,
    harvestSortingFormAdditionalRejected,
    setHarvestSortingFormAdditionalRejected,
    openAddRejectedQuantity,
    removeAddedRejectedQuantity,
    isAddingOwnerRejectedQuantity,
    harvestSortingFormAdditionalOwnerRejected,
    setHarvestSortingFormAdditionalOwnerRejected,
    openAddOwnerRejectedQuantity,
    removeAddedOwnerRejectedQuantity,
    harvestSortingFormTotalHarvested,
    setHarvestSortingFormTotalHarvested,
    harvestSortingFormOwnerHarvested,
    setHarvestSortingFormOwnerHarvested,
    openHarvestSortingGlobalForm,
    closeHarvestSortingGlobalForm,
    prefillSortingFormForRestore,
  };
}