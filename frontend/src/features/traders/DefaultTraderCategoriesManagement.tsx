import React from 'react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import SettingsInnerTemplate from '../../components/ui/SettingsInnerTemplate';
import { TraderCategoryCardsList } from './components/TraderCategoryCardsList';
import { TraderCategoryFormModal } from './components/TraderCategoryFormModal';
import { useDefaultTraderCategoriesManagement } from './hooks/useDefaultTraderCategoriesManagement';
import type {
  DefaultTraderCategoriesHeaderState,
  DefaultTraderCategoriesManagementProps,
} from './tradersManagement.types';

export type { DefaultTraderCategoriesHeaderState };

const DefaultTraderCategoriesManagement: React.FC<DefaultTraderCategoriesManagementProps> = ({ onHeaderStateChange }) => {
  const {
    t,
    loading,
    shownError,
    sortedTraders,
    sortedCategories,
    selectedCategory,
    selectedCategoryId,
    setSelectedCategoryId,
    isAddDialogOpen,
    isEditDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    categoryName,
    setCategoryName,
    categoryNotes,
    setCategoryNotes,
    shareRows,
    updateShareRow,
    removeShareRow,
    addShareRow,
    totalPercent,
    isTotalExact,
    showAddRowBlockReason,
    addRowBlockReason,
    addError,
    editError,
    isSubmitting,
    handleDeleteCategory,
    closeDialogs,
    onSaveFromModal,
    getRowAvailableTraders,
  } = useDefaultTraderCategoriesManagement({ onHeaderStateChange });

  return (
    <SettingsInnerTemplate
      loadingMessage={loading ? t.loading : null}
      errorMessage={shownError ?? (sortedTraders.length === 0 && !loading ? t.noTraders : null)}
      emptyMessage={sortedCategories.length === 0 && !loading ? t.empty : null}
    >
      <TraderCategoryCardsList
        categories={sortedCategories}
        selectedCategoryId={selectedCategoryId}
        onToggleCategory={(id) => {
          setSelectedCategoryId((currentId) => (currentId === id ? null : id));
        }}
        t={{
          categoryId: t.categoryId,
          notesLabel: t.notesLabel,
          sharesDetailsTitle: t.sharesDetailsTitle,
        }}
      />

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title={t.deleteTitle}
        message={selectedCategory ? t.deleteMessage(selectedCategory.name) : t.deleteFallback}
        confirmLabel={t.deleteConfirm}
        cancelLabel={t.cancel}
        onConfirm={() => {
          void handleDeleteCategory();
        }}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />

      <TraderCategoryFormModal
        isAddDialogOpen={isAddDialogOpen}
        isEditDialogOpen={isEditDialogOpen}
        selectedCategoryName={selectedCategory?.name ?? ''}
        t={{
          cancel: t.cancel,
          addTitle: t.addTitle,
          editTitle: t.editTitle,
          addMessage: t.addMessage,
          editMessage: t.editMessage,
          categoryNameLabel: t.categoryNameLabel,
          categoryNamePlaceholder: t.categoryNamePlaceholder,
          notesLabel: t.notesLabel,
          notesPlaceholder: t.notesPlaceholder,
          allocationSectionTitle: t.allocationSectionTitle,
          selectTraderOption: t.selectTraderOption,
          percentPlaceholder: t.percentPlaceholder,
          removeRow: t.removeRow,
          addRow: t.addRow,
          totalPercentLabel: t.totalPercentLabel,
          save: t.save,
        }}
        categoryName={categoryName}
        setCategoryName={setCategoryName}
        categoryNotes={categoryNotes}
        setCategoryNotes={setCategoryNotes}
        shareRows={shareRows}
        getAvailableTradersForRow={getRowAvailableTraders}
        updateShareRow={updateShareRow}
        removeShareRow={removeShareRow}
        addShareRow={addShareRow}
        totalPercent={totalPercent}
        isTotalExact={isTotalExact}
        showAddRowBlockReason={showAddRowBlockReason}
        addRowBlockReason={addRowBlockReason}
        addError={addError}
        editError={editError}
        isSubmitting={isSubmitting}
        onClose={closeDialogs}
        onSave={onSaveFromModal}
      />
    </SettingsInnerTemplate>
  );
};

export default DefaultTraderCategoriesManagement;
