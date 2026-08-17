import React from 'react';
import { FaCirclePlus, FaXmark } from 'react-icons/fa6';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import ManagementCardsGrid from '../../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../../components/ui/ManagementSelectableCard';
import SettingsInnerTemplate from '../../../components/ui/SettingsInnerTemplate';
import { SubmitButton } from '../../../components/ui/SubmitButton';
import type { IsraelCategoryGradesManagementProps } from '../israelCategoryGradesPage.types';
import { useIsraelCategoryGradesManagement } from '../hooks/useIsraelCategoryGradesManagement';
import styles from './styles/IsraelCategoryGradesShared.module.css';

export type { IsraelCategoryGradesHeaderState } from '../israelCategoryGradesPage.types';

const IsraelCategoryGradesManagement: React.FC<
  IsraelCategoryGradesManagementProps
> = ({ lang, onHeaderStateChange }) => {
  const {
    t,
    loading,
    shownError,
    activeSeasonId,
    categoryById,
    availableCategoriesForAdd,
    sortedEntries,
    selectedEntry,
    selectedEntryId,
    setSelectedEntryId,
    selectedEntryCategoryName,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isAddDialogOpen,
    setIsAddDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    formState,
    setFormState,
    addError,
    editError,
    isSubmitting,
    handleAddRow,
    handleRemoveRow,
    handleUpdateRow,
    handleDeleteEntry,
    handleAddEntry,
    handleEditEntry,
  } = useIsraelCategoryGradesManagement({ lang, onHeaderStateChange });

  return (
    <SettingsInnerTemplate
      loadingMessage={loading ? t.loading : null}
      errorMessage={shownError}
      emptyMessage={
        !activeSeasonId
          ? t.noActiveSeason
          : sortedEntries.length === 0 && !loading
            ? t.empty
            : null
      }
    >
      {sortedEntries.length > 0 ? (
        <ManagementCardsGrid>
          {sortedEntries.map((entry) => {
            const categoryName =
              entry.category?.name ??
              categoryById.get(entry.categoryId) ??
              `#${entry.categoryId}`;
            const isSelected = selectedEntryId === entry.id;
            const badgeLabel =
              categoryName.trim().slice(0, 2).toUpperCase() || '#';
            const gradeEntries = Object.entries(entry.grades);

            return (
              <li key={entry.id}>
                <ManagementSelectableCard
                  isSelected={isSelected}
                  badgeLabel={badgeLabel}
                  onToggle={() => {
                    setSelectedEntryId((previousId) =>
                      previousId === entry.id ? null : entry.id,
                    );
                  }}
                  topContent={
                    <span className="seasons-manager__year">
                      {categoryName}
                    </span>
                  }
                  bottomContent={
                    <span className={`seasons-manager__meta ${styles.meta}`}>
                      {gradeEntries.map(([key, value]) => (
                        <span key={key} className={styles.gradeChip}>
                          <b>{key}</b>
                          <span>{value}</span>
                        </span>
                      ))}
                    </span>
                  }
                />
              </li>
            );
          })}
        </ManagementCardsGrid>
      ) : null}

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title={t.deleteTitle}
        message={
          selectedEntry
            ? t.deleteMessage(selectedEntryCategoryName)
            : t.deleteFallback
        }
        confirmLabel={t.deleteConfirm}
        cancelLabel={t.cancel}
        onConfirm={() => {
          void handleDeleteEntry();
        }}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />

      {isAddDialogOpen || isEditDialogOpen ? (
        <div className="modal-overlay">
          <div className="modal-dialog modal-dialog--form">
            <button
              className="modal-close"
              type="button"
              aria-label={t.cancel}
              onClick={() => {
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
              }}
            >
              <FaXmark />
            </button>
            <h3 className="modal-title">
              {isAddDialogOpen ? t.addTitle : t.editTitle}
            </h3>
            <div className="modal-message">
              {isAddDialogOpen
                ? t.addMessage
                : t.editMessage(selectedEntryCategoryName)}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t.categoryLabel}</label>
              <select
                className="seasons-manager__year-input"
                value={formState.categoryId}
                disabled={isEditDialogOpen}
                onChange={(event) => {
                  setFormState((previous) => ({
                    ...previous,
                    categoryId: event.target.value
                      ? Number(event.target.value)
                      : '',
                  }));
                }}
              >
                <option value="" disabled>
                  {t.selectCategory}
                </option>
                {isEditDialogOpen && selectedEntry ? (
                  <option value={selectedEntry.categoryId}>
                    {selectedEntryCategoryName}
                  </option>
                ) : (
                  availableCategoriesForAdd.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t.gradesLabel}</label>
              <div className={styles.rowsCard}>
                {formState.rows.map((row, index) => (
                  <div key={index} className={styles.row}>
                    <input
                      className="seasons-manager__year-input"
                      type="text"
                      value={row.key}
                      onChange={(event) =>
                        handleUpdateRow(index, 'key', event.target.value)
                      }
                      placeholder={t.gradeKeyPlaceholder}
                    />
                    <input
                      className="seasons-manager__year-input"
                      type="text"
                      value={row.value}
                      onChange={(event) =>
                        handleUpdateRow(index, 'value', event.target.value)
                      }
                      placeholder={t.gradeValuePlaceholder}
                    />
                    <button
                      className={styles.rowRemove}
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      disabled={formState.rows.length <= 1}
                      aria-label={t.removeRow}
                      title={t.removeRow}
                    >
                      <FaXmark />
                    </button>
                  </div>
                ))}
              </div>
              <button
                className={styles.addRowButton}
                type="button"
                onClick={handleAddRow}
              >
                <FaCirclePlus />
                <span>{t.addRow}</span>
              </button>
            </div>

            {isAddDialogOpen && addError ? (
              <p className="seasons-manager__error">{addError}</p>
            ) : null}
            {isEditDialogOpen && editError ? (
              <p className="seasons-manager__error">{editError}</p>
            ) : null}

            <div className="modal-actions">
              <button
                className="btn btn-danger"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setIsEditDialogOpen(false);
                }}
                type="button"
              >
                {t.cancel}
              </button>
              <SubmitButton
                className="btn btn-success"
                onClick={() => {
                  if (isAddDialogOpen) {
                    void handleAddEntry();
                    return;
                  }

                  void handleEditEntry();
                }}
                type="button"
                isLoading={isSubmitting}
                loadingText={t.saving}
              >
                {t.save}
              </SubmitButton>
            </div>
          </div>
        </div>
      ) : null}
    </SettingsInnerTemplate>
  );
};

export default IsraelCategoryGradesManagement;
