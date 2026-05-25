import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { addField, editField, fetchFields, removeField } from '../../store/fieldsSlice';
import type { AppDispatch, RootState } from '../../store';
import { getManagementI18n, resolveAppLang } from '../settings/managementI18n';

export type FieldsHeaderState = {
  count: number;
  isEditDisabled: boolean;
  isDeleteDisabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

type FieldsManagementProps = {
  onHeaderStateChange?: (state: FieldsHeaderState | null) => void;
};

const FieldsManagement: React.FC<FieldsManagementProps> = ({ onHeaderStateChange }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: fields, loading, error } = useSelector((state: RootState) => state.fields);
  const [newFieldName, setNewFieldName] = useState('');
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editFieldName, setEditFieldName] = useState('');
  const t = getManagementI18n(resolveAppLang()).fields;

  useEffect(() => {
    dispatch(fetchFields());
  }, [dispatch]);

  const sortedFields = useMemo(
    () => [...fields].sort((a, b) => a.name.localeCompare(b.name, 'he')),
    [fields],
  );

  useEffect(() => {
    if (selectedFieldId && !sortedFields.some((field) => field.id === selectedFieldId)) {
      setSelectedFieldId(null);
    }
  }, [sortedFields, selectedFieldId]);

  const selectedField = useMemo(
    () => sortedFields.find((field) => field.id === selectedFieldId) ?? null,
    [sortedFields, selectedFieldId],
  );

  const handleAdd = async () => {
    const trimmedName = newFieldName.trim();

    if (!trimmedName) {
      return;
    }

    setAddError(null);
    const actionResult = await dispatch(addField({ name: trimmedName }));

    if (addField.fulfilled.match(actionResult)) {
      setNewFieldName('');
      return;
    }

    const failureMessage =
      (typeof actionResult.payload === 'string' && actionResult.payload) ||
      actionResult.error.message ||
      t.addFailed;

    setAddError(failureMessage);
  };

  const handleOpenDeleteDialog = () => {
    if (!selectedField) {
      return;
    }

    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleOpenEditDialog = () => {
    if (!selectedField) {
      return;
    }

    setEditError(null);
    setEditFieldName(selectedField.name);
    setIsEditDialogOpen(true);
  };

  const handleEditField = async () => {
    if (!selectedField) {
      return;
    }

    const trimmedName = editFieldName.trim();
    if (!trimmedName) {
      setEditError(t.emptyName);
      return;
    }

    const actionResult = await dispatch(editField({ id: selectedField.id, name: trimmedName }));

    if (editField.fulfilled.match(actionResult)) {
      setEditError(null);
      setIsEditDialogOpen(false);
      return;
    }

    const failureMessage =
      (typeof actionResult.payload === 'string' && actionResult.payload) ||
      actionResult.error.message ||
      t.editFailed;

    setEditError(failureMessage);
  };

  const handleDeleteField = async () => {
    if (!selectedField) {
      return;
    }

    const actionResult = await dispatch(removeField(selectedField.id));

    if (removeField.fulfilled.match(actionResult)) {
      setDeleteError(null);
      setIsDeleteDialogOpen(false);
      return;
    }

    const failureMessage =
      (typeof actionResult.payload === 'string' && actionResult.payload) ||
      actionResult.error.message ||
      t.deleteFailed;

    setDeleteError(failureMessage);
    setIsDeleteDialogOpen(false);
  };

  const isEditDisabled = !selectedField || loading;
  const isDeleteDisabled = !selectedField || loading;
  const shownError = addError ?? editError ?? deleteError ?? error;

  useEffect(() => {
    if (!onHeaderStateChange) {
      return;
    }

    onHeaderStateChange({
      count: sortedFields.length,
      isEditDisabled,
      isDeleteDisabled,
      onEdit: handleOpenEditDialog,
      onDelete: handleOpenDeleteDialog,
    });
  }, [onHeaderStateChange, sortedFields.length, isEditDisabled, isDeleteDisabled, selectedField, loading]);

  useEffect(() => () => {
    onHeaderStateChange?.(null);
  }, [onHeaderStateChange]);

  return (
    <div className="seasons-manager">
      <div className="seasons-manager__create-row">
        <input
          className="seasons-manager__year-input"
          type="text"
          value={newFieldName}
          onChange={(e) => setNewFieldName(e.target.value)}
          placeholder={t.newFieldPlaceholder}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            void handleAdd();
          }}
          disabled={loading}
        >
          {t.addField}
        </button>
      </div>

      {loading ? <p className="seasons-manager__state">{t.loading}</p> : null}
      {shownError ? <p className="seasons-manager__error">{shownError}</p> : null}
      {newFieldName.trim() === '' && newFieldName !== '' ? (
        <p className="seasons-manager__error">{t.emptyName}</p>
      ) : null}

      {sortedFields.length === 0 && !loading ? (
        <div className="seasons-manager__empty">{t.empty}</div>
      ) : null}

      {sortedFields.length > 0 ? (
        <ul className="seasons-manager__cards">
          {sortedFields.map((field) => {
            const isSelected = selectedFieldId === field.id;
            const fieldBadgeLabel = field.name.trim().slice(0, 2).toUpperCase() || '#';

            return (
              <li key={field.id}>
                <button
                  type="button"
                  className={`seasons-manager__card${isSelected ? ' is-selected' : ''}`}
                  onClick={() => {
                    setSelectedFieldId((previousSelectedId) =>
                      previousSelectedId === field.id ? null : field.id,
                    );
                  }}
                >
                  <span className={`seasons-manager__selector${isSelected ? ' is-selected' : ''}`}>
                    {isSelected ? '✓' : fieldBadgeLabel}
                  </span>

                  <span className="seasons-manager__card-main">
                    <span className="seasons-manager__year">{field.name}</span>
                    <span className="seasons-manager__meta">{t.fieldId}: {field.id}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title={t.deleteTitle}
        message={
          selectedField
            ? t.deleteMessage(selectedField.name)
            : t.deleteFallback
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
            <h3 className="modal-title">{t.editTitle}</h3>
            <div className="modal-message">
              {selectedField ? t.editMessage(selectedField.name) : t.editFallback}
            </div>

            <input
              className="seasons-manager__year-input"
              type="text"
              value={editFieldName}
              onChange={(event) => setEditFieldName(event.target.value)}
              placeholder={t.editFieldPlaceholder}
              autoFocus
            />

            {editError ? <p className="seasons-manager__error">{editError}</p> : null}

            <div className="modal-actions">
              <button className="btn btn-danger" onClick={() => setIsEditDialogOpen(false)} type="button">
                {t.cancel}
              </button>
              <button
                className="btn btn-success"
                onClick={() => {
                  void handleEditField();
                }}
                type="button"
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default FieldsManagement;
