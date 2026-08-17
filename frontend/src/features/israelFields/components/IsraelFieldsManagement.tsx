import React from 'react';
import { FaXmark } from 'react-icons/fa6';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import ManagementCardsGrid from '../../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../../components/ui/ManagementSelectableCard';
import SettingsInnerTemplate from '../../../components/ui/SettingsInnerTemplate';
import { SubmitButton } from '../../../components/ui/SubmitButton';
import type { IsraelFieldsManagementProps } from '../israelFieldsPage.types';
import { useIsraelFieldsManagement } from '../hooks/useIsraelFieldsManagement';

export type { IsraelFieldsHeaderState } from '../israelFieldsPage.types';

const IsraelFieldsManagement: React.FC<IsraelFieldsManagementProps> = ({
  lang,
  onHeaderStateChange,
}) => {
  const {
    t,
    loading,
    shownError,
    sortedFields,
    newFieldName,
    setNewFieldName,
    selectedFieldId,
    setSelectedFieldId,
    selectedField,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    editFieldName,
    setEditFieldName,
    editError,
    isSavingEdit,
    isAdding,
    handleAdd,
    handleDeleteField,
    handleEditField,
  } = useIsraelFieldsManagement({ lang, onHeaderStateChange });

  return (
    <SettingsInnerTemplate
      toolbar={
        <div className="seasons-manager__create-row">
          <input
            className="seasons-manager__year-input"
            type="text"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            placeholder={t.newFieldPlaceholder}
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
            {t.addField}
          </SubmitButton>
        </div>
      }
      loadingMessage={loading ? t.loading : null}
      errorMessage={shownError}
      emptyMessage={sortedFields.length === 0 && !loading ? t.empty : null}
    >
      {sortedFields.length > 0 ? (
        <ManagementCardsGrid>
          {sortedFields.map((field) => {
            const isSelected = selectedFieldId === field.id;
            const fieldBadgeLabel =
              field.name.trim().slice(0, 2).toUpperCase() || '#';

            return (
              <li key={field.id}>
                <ManagementSelectableCard
                  isSelected={isSelected}
                  badgeLabel={fieldBadgeLabel}
                  onToggle={() => {
                    setSelectedFieldId((previousSelectedId) =>
                      previousSelectedId === field.id ? null : field.id,
                    );
                  }}
                  topContent={
                    <>
                      <span className="seasons-manager__year">
                        {field.name}
                      </span>
                      <span className="seasons-manager__meta">
                        {t.fieldId}: {field.id}
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
          selectedField ? t.deleteMessage(selectedField.name) : t.deleteFallback
        }
        confirmLabel={t.deleteConfirm}
        cancelLabel={t.cancel}
        onConfirm={() => {
          void handleDeleteField();
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
              {selectedField
                ? t.editMessage(selectedField.name)
                : t.editFallback}
            </div>

            <input
              className="seasons-manager__year-input"
              type="text"
              value={editFieldName}
              onChange={(event) => setEditFieldName(event.target.value)}
              placeholder={t.editFieldPlaceholder}
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
                  void handleEditField();
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

export default IsraelFieldsManagement;
