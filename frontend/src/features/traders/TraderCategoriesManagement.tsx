import React from 'react';
import { FaTriangleExclamation } from 'react-icons/fa6';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { GlobalScopedFilters } from '../../components/ui/GlobalScopedFilters';
import SettingsInnerTemplate from '../../components/ui/SettingsInnerTemplate';
import { TraderCategoryCardsList } from './components/TraderCategoryCardsList';
import { TraderCategoryFormModal } from './components/TraderCategoryFormModal';
import { useTraderCategoriesManagement } from './hooks/useTraderCategoriesManagement';
import type { TraderCategoriesHeaderState, TraderCategoriesManagementProps } from './tradersManagement.types';
import styles from './components/styles/TraderCategoriesShared.module.css';

export type { TraderCategoriesHeaderState };

const TraderCategoriesManagement: React.FC<TraderCategoriesManagementProps> = ({ onHeaderStateChange }) => {
  const {
    FILTER_SCOPE,
    filters,
    t,
    loading,
    shownError,
    isViewingNonActiveSeason,
    sortedTraders,
    filteredCategories,
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
    supportedGrades,
    toggleSupportedGrade,
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
    isReorderDisabled,
    onReorderCategories,
  } = useTraderCategoriesManagement({ onHeaderStateChange });

  return (
    <SettingsInnerTemplate
      filters={(
        <GlobalScopedFilters
          scope={FILTER_SCOPE}
          filters={filters}
          className="customer-categories-manager__filters"
          direction="rtl"
        />
      )}
      loadingMessage={loading ? t.loading : null}
      errorMessage={shownError ?? (sortedTraders.length === 0 && !loading ? t.noTraders : null)}
      emptyMessage={filteredCategories.length === 0 && !loading ? t.empty : null}
    >
      <p className={styles.warningNotice}>
        <FaTriangleExclamation aria-hidden="true" />
        <span>{t.warningNotice}</span>
        <FaTriangleExclamation aria-hidden="true" />
      </p>

      <TraderCategoryCardsList
        categories={filteredCategories}
        selectedCategoryId={selectedCategoryId}
        onToggleCategory={(id) => {
          if (isViewingNonActiveSeason) {
            return;
          }
          setSelectedCategoryId((currentId) => (currentId === id ? null : id));
        }}
        onReorder={onReorderCategories}
        isReorderDisabled={isReorderDisabled}
        isSelectionDisabled={isViewingNonActiveSeason}
        selectionDisabledTitle={t.nonActiveSeasonSelectionDisabled}
        t={{
          categoryId: t.categoryId,
          notesLabel: t.notesLabel,
          sharesDetailsTitle: t.sharesDetailsTitle,
          priorityLabel: t.priorityLabel,
          dragHandleLabel: t.dragHandleLabel,
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
          supportedGradesLabel: t.supportedGradesLabel,
          selectTraderOption: t.selectTraderOption,
          percentPlaceholder: t.percentPlaceholder,
          removeRow: t.removeRow,
          addRow: t.addRow,
          totalPercentLabel: t.totalPercentLabel,
          save: t.save,
          saving: t.saving,
        }}
        categoryName={categoryName}
        setCategoryName={setCategoryName}
        categoryNotes={categoryNotes}
        setCategoryNotes={setCategoryNotes}
        supportedGrades={supportedGrades}
        toggleSupportedGrade={toggleSupportedGrade}
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

export default TraderCategoriesManagement;
