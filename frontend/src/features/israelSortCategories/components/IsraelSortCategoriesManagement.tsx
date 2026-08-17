import React from 'react';
import { FaXmark } from 'react-icons/fa6';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import ManagementCardsGrid from '../../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../../components/ui/ManagementSelectableCard';
import SettingsInnerTemplate from '../../../components/ui/SettingsInnerTemplate';
import { SubmitButton } from '../../../components/ui/SubmitButton';
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
    newCategoryName,
    setNewCategoryName,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedCategory,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    editCategoryName,
    setEditCategoryName,
    editError,
    isSavingEdit,
    isAdding,
    handleAdd,
    handleDeleteCategory,
    handleEditCategory,
  } = useIsraelSortCategoriesManagement({ lang, onHeaderStateChange });

  return (
    <SettingsInnerTemplate
      toolbar={
        <div className="seasons-manager__create-row">
          <input
            className="seasons-manager__year-input"
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder={t.newCategoryPlaceholder}
          />
          <SubmitButton
            className="btn btn-primary"
            onClick={() => {
              void handleAdd();
            }}
            disabled={loading}
            isLoading={isAdding}
            loadingText={t.adding}
          >
            {t.addCategory}
          </SubmitButton>
        </div>
      }
      loadingMessage={loading ? t.loading : null}
      errorMessage={shownError}
      emptyMessage={sortedCategories.length === 0 && !loading ? t.empty : null}
    >
      {sortedCategories.length > 0 ? (
        <ManagementCardsGrid>
          {sortedCategories.map((category) => {
            const isSelected = selectedCategoryId === category.id;
            const badgeLabel =
              category.name.trim().slice(0, 2).toUpperCase() || '#';

            return (
              <li key={category.id}>
                <ManagementSelectableCard
                  isSelected={isSelected}
                  badgeLabel={badgeLabel}
                  onToggle={() => {
                    setSelectedCategoryId((previousSelectedId) =>
                      previousSelectedId === category.id ? null : category.id,
                    );
                  }}
                  topContent={
                    <>
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

      {isEditDialogOpen ? (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <button
              className="modal-close"
              type="button"
              aria-label={t.cancel}
              onClick={() => setIsEditDialogOpen(false)}
            >
              <FaXmark />
            </button>
            <h3 className="modal-title">{t.editTitle}</h3>
            <div className="modal-message">
              {selectedCategory
                ? t.editMessage(selectedCategory.name)
                : t.editFallback}
            </div>

            <input
              className="seasons-manager__year-input"
              type="text"
              value={editCategoryName}
              onChange={(event) => setEditCategoryName(event.target.value)}
              placeholder={t.editCategoryPlaceholder}
              autoFocus
            />

            {editError ? (
              <p className="seasons-manager__error">{editError}</p>
            ) : null}

            <div className="modal-actions">
              <button
                className="btn btn-danger"
                onClick={() => setIsEditDialogOpen(false)}
                type="button"
                disabled={isSavingEdit}
              >
                {t.cancel}
              </button>
              <SubmitButton
                className="btn btn-success"
                onClick={() => {
                  void handleEditCategory();
                }}
                type="button"
                isLoading={isSavingEdit}
                loadingText={t.updating}
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
