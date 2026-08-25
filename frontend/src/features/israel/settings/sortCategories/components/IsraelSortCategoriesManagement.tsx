import React, { useState } from 'react';
import { FaXmark } from 'react-icons/fa6';
import { ConfirmDialog } from '../../../../../components/ui/ConfirmDialog';
import ManagementCardsGrid from '../../../../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../../../../components/ui/ManagementSelectableCard';
import SettingsInnerTemplate from '../../../../../components/ui/SettingsInnerTemplate';
import { SubmitButton } from '../../../../../components/ui/SubmitButton';
import { TRADER_CATEGORY_GRADE_OPTIONS } from '../../../../traders/utils/traderCategoryGrades.util';
import gradeStyles from '../../../../traders/components/styles/TraderCategoriesShared.module.css';
import type { IsraelSortCategoriesManagementProps } from '../israelSortCategoriesPage.types';
import { useIsraelSortCategoriesManagement } from '../hooks/useIsraelSortCategoriesManagement';

export type { IsraelSortCategoriesHeaderState } from '../israelSortCategoriesPage.types';

const IsraelSortCategoriesManagement: React.FC<
  IsraelSortCategoriesManagementProps
> = ({ lang, onHeaderStateChange }) => {
  const {
    t,
    loading,
    shownError,
    sortedCategories,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedCategory,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isAddDialogOpen,
    isEditDialogOpen,
    closeDialogs,
    formState,
    setFormState,
    toggleFormGrade,
    addFormCustomGrade,
    removeFormCustomGrade,
    customGradeError,
    addFormGradeGroup,
    removeFormGradeGroup,
    renameFormGradeGroup,
    toggleFormGradeInGroup,
    addError,
    editError,
    isSubmitting,
    handleAddCategory,
    handleDeleteCategory,
    handleEditCategory,
    onReorderCategories,
  } = useIsraelSortCategoriesManagement({ lang, onHeaderStateChange });

  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [customGradeInput, setCustomGradeInput] = useState('');

  const handleAddCustomGrade = () => {
    addFormCustomGrade(customGradeInput);
    setCustomGradeInput('');
  };

  const customGrades = formState.supportedGrades.filter(
    (grade) =>
      !(TRADER_CATEGORY_GRADE_OPTIONS as readonly string[]).includes(grade),
  );

  const handleDrop = (targetId: number) => {
    if (draggedId === null || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const currentIds = sortedCategories.map((category) => category.id);
    const fromIndex = currentIds.indexOf(draggedId);
    const toIndex = currentIds.indexOf(targetId);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const reorderedIds = [...currentIds];
    reorderedIds.splice(fromIndex, 1);
    reorderedIds.splice(toIndex, 0, draggedId);

    onReorderCategories(reorderedIds);
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <SettingsInnerTemplate
      loadingMessage={loading ? t.loading : null}
      errorMessage={shownError}
      emptyMessage={sortedCategories.length === 0 && !loading ? t.empty : null}
    >
      {sortedCategories.length > 0 ? (
        <ManagementCardsGrid>
          {sortedCategories.map((category, index) => {
            const isSelected = selectedCategoryId === category.id;
            const badgeLabel =
              category.name.trim().slice(0, 2).toUpperCase() || '#';

            return (
              <li
                key={category.id}
                draggable
                className={`${gradeStyles.draggableCard}${draggedId === category.id ? ` ${gradeStyles.draggingCard}` : ''}${dragOverId === category.id && draggedId !== category.id ? ` ${gradeStyles.dragOverCard}` : ''}`}
                onDragStart={() => setDraggedId(category.id)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverId(category.id);
                }}
                onDragLeave={() =>
                  setDragOverId((current) =>
                    current === category.id ? null : current,
                  )
                }
                onDrop={(event) => {
                  event.preventDefault();
                  handleDrop(category.id);
                }}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDragOverId(null);
                }}
              >
                <ManagementSelectableCard
                  isSelected={isSelected}
                  badgeLabel={badgeLabel}
                  onToggle={() => {
                    setSelectedCategoryId((previousSelectedId) =>
                      previousSelectedId === category.id ? null : category.id,
                    );
                  }}
                  topAside={
                    <span
                      className={gradeStyles.dragHandle}
                      title={t.dragHandleLabel}
                      aria-label={t.dragHandleLabel}
                    >
                      ⠿
                    </span>
                  }
                  topContent={
                    <>
                      <span className={gradeStyles.priorityBadge}>
                        {t.priorityLabel} {index + 1}
                      </span>
                      <span className="seasons-manager__year">
                        {category.name}
                      </span>
                      <span className="seasons-manager__meta">
                        {t.categoryId}: {category.id}
                      </span>
                    </>
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
          selectedCategory
            ? t.deleteMessage(selectedCategory.name)
            : t.deleteFallback
        }
        confirmLabel={t.deleteConfirm}
        cancelLabel={t.cancel}
        onConfirm={() => {
          void handleDeleteCategory();
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
              onClick={closeDialogs}
            >
              <FaXmark />
            </button>
            <h3 className="modal-title">
              {isAddDialogOpen ? t.addTitle : t.editTitle}
            </h3>
            <div className="modal-message">
              {isAddDialogOpen
                ? t.addMessage
                : t.editMessage(selectedCategory?.name ?? '')}
            </div>

            <div className={gradeStyles.formGrid}>
              <div className={gradeStyles.field}>
                <label className={gradeStyles.label}>
                  {t.categoryNameLabel}
                </label>
                <input
                  className="seasons-manager__year-input"
                  type="text"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  placeholder={t.categoryNamePlaceholder}
                  autoFocus
                />
              </div>

              <div className={gradeStyles.field}>
                <label className={gradeStyles.label}>{t.notesLabel}</label>
                <input
                  className="seasons-manager__year-input"
                  type="text"
                  value={formState.notes}
                  onChange={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      notes: event.target.value,
                    }))
                  }
                  placeholder={t.notesPlaceholder}
                />
              </div>
            </div>

            <p className={gradeStyles.sharesSubtitle}>
              {t.supportedGradesLabel}
            </p>
            <div className={gradeStyles.gradesChecklist}>
              {TRADER_CATEGORY_GRADE_OPTIONS.map((grade) => (
                <label key={grade} className={gradeStyles.gradeCheckboxItem}>
                  <input
                    type="checkbox"
                    checked={formState.supportedGrades.includes(grade)}
                    onChange={() => toggleFormGrade(grade)}
                  />
                  <span>{grade}</span>
                </label>
              ))}
            </div>

            <p className={gradeStyles.sharesSubtitle}>{t.customGradesLabel}</p>
            <div className={gradeStyles.gradesChecklist}>
              {customGrades.map((grade) => (
                <span key={grade} className={gradeStyles.gradeCheckboxItem}>
                  <span>{grade}</span>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => removeFormCustomGrade(grade)}
                    aria-label={t.removeCustomGradeLabel}
                    title={t.removeCustomGradeLabel}
                  >
                    <FaXmark />
                  </button>
                </span>
              ))}
            </div>
            <div className={gradeStyles.gradeGroupsArea}>
              <div className={gradeStyles.gradeGroupRowHead}>
                <input
                  className="seasons-manager__year-input"
                  style={{ minWidth: 220 }}
                  type="text"
                  value={customGradeInput}
                  onChange={(event) => setCustomGradeInput(event.target.value)}
                  placeholder={t.customGradePlaceholder}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddCustomGrade}
                >
                  {t.addCustomGradeLabel}
                </button>
              </div>
            </div>
            {customGradeError ? (
              <p className="seasons-manager__error">{customGradeError}</p>
            ) : null}

            <p className={gradeStyles.sharesSubtitle}>{t.gradeGroupsLabel}</p>
            <div className={gradeStyles.gradeGroupsArea}>
              {formState.gradeGroupRows.map((group) => (
                <div key={group.localId} className={gradeStyles.gradeGroupRow}>
                  <div className={gradeStyles.gradeGroupRowHead}>
                    <input
                      className="seasons-manager__year-input"
                      type="text"
                      value={group.name}
                      onChange={(event) =>
                        renameFormGradeGroup(group.localId, event.target.value)
                      }
                      placeholder={t.groupNamePlaceholder}
                    />
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => removeFormGradeGroup(group.localId)}
                    >
                      {t.removeGroupLabel}
                    </button>
                  </div>
                  <div className={gradeStyles.gradesChecklist}>
                    {formState.supportedGrades.map((grade) => (
                      <label
                        key={grade}
                        className={gradeStyles.gradeCheckboxItem}
                      >
                        <input
                          type="checkbox"
                          checked={group.grades.includes(grade)}
                          onChange={() =>
                            toggleFormGradeInGroup(group.localId, grade)
                          }
                        />
                        <span>{grade}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-primary"
                onClick={addFormGradeGroup}
              >
                {t.addGroupLabel}
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
                onClick={closeDialogs}
                type="button"
                disabled={isSubmitting}
              >
                {t.cancel}
              </button>
              <SubmitButton
                className="btn btn-success"
                onClick={() => {
                  if (isAddDialogOpen) {
                    void handleAddCategory();
                    return;
                  }

                  void handleEditCategory();
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

export default IsraelSortCategoriesManagement;
