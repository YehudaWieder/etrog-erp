import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { addField, editField, fetchFields, removeField } from '../../store/fieldsSlice';
import type { AppDispatch, RootState } from '../../store';

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
      'הוספת השדה נכשלה.';

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
      setEditError('שם השדה לא יכול להיות ריק.');
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
      'עדכון השדה נכשל.';

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
      'לא ניתן למחוק את השדה שנבחר.';

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
          placeholder="שם שדה חדש"
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            void handleAdd();
          }}
          disabled={loading}
        >
          הוסף שדה
        </button>
      </div>

      {loading ? <p className="seasons-manager__state">טוען שדות...</p> : null}
      {shownError ? <p className="seasons-manager__error">{shownError}</p> : null}
      {newFieldName.trim() === '' && newFieldName !== '' ? (
        <p className="seasons-manager__error">שם השדה לא יכול להיות ריק.</p>
      ) : null}

      {sortedFields.length === 0 && !loading ? (
        <div className="seasons-manager__empty">אין שדות להצגה כרגע.</div>
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
                    <span className="seasons-manager__meta">מזהה שדה: {field.id}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="מחיקת שדה"
        message={
          selectedField
            ? `האם למחוק את השדה ${selectedField.name}? פעולה זו לא ניתנת לשחזור.`
            : 'האם למחוק את השדה שנבחר?'
        }
        confirmLabel="מחק"
        cancelLabel="ביטול"
        onConfirm={() => {
          void handleDeleteField();
        }}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />

      {isEditDialogOpen ? (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <h3 className="modal-title">עריכת שדה</h3>
            <div className="modal-message">
              {selectedField ? `עדכון שם השדה ${selectedField.name}` : 'עדכון שם שדה נבחר'}
            </div>

            <input
              className="seasons-manager__year-input"
              type="text"
              value={editFieldName}
              onChange={(event) => setEditFieldName(event.target.value)}
              placeholder="שם שדה"
              autoFocus
            />

            {editError ? <p className="seasons-manager__error">{editError}</p> : null}

            <div className="modal-actions">
              <button className="btn btn-danger" onClick={() => setIsEditDialogOpen(false)} type="button">
                ביטול
              </button>
              <button
                className="btn btn-success"
                onClick={() => {
                  void handleEditField();
                }}
                type="button"
              >
                שמור
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default FieldsManagement;
