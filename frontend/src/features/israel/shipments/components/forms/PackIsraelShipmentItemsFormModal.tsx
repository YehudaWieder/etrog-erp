import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaTrashCan, FaXmark } from 'react-icons/fa6';
import { SubmitButton } from '../../../../../components/ui/SubmitButton';
import { CustomSelect } from '../../../../../components/ui/CustomSelect';
import { TopLoadingBar } from '../../../../../components/ui/TopLoadingBar';
import type { IsraelBoxRecord, IsraelBoxStatus } from '../../../../../services/israel/israelBoxesApi';
import type { IsraelShipmentRecord } from '../../../../../services/israel/israelShipmentsApi';
import type { IsraelSortCategory } from '../../../../../services/israel/israelSortCategoriesApi';
import type { IsraelShipmentItemRecord } from '../../../../../services/israel/israelShipmentItemsApi';
import type { IsraelPitamStatus } from '../../../../../services/israel/israelClassificationsApi';
import type { PackIsraelShipmentItemRowDraft } from '../../hooks/usePackIsraelShipmentItemsForm';
import { HARVEST_GRADE_OPTIONS } from '../../../../harvest/utils/harvestPage.utils';
import { IsraelBoxNumberTypeahead } from './IsraelBoxNumberTypeahead';
import boxFormStyles from './styles/BoxFormModal.module.css';
import styles from './styles/PackItemsFormModal.module.css';

const PITAM_STATUSES: IsraelPitamStatus[] = ['WITH_PITAM', 'WITHOUT_PITAM', 'MIXED'];
const BOX_STATUSES: IsraelBoxStatus[] = ['OPEN', 'CLOSED', 'SHIPPED', 'DELIVERED'];
const STRETCH_FIELD_STYLE = { maxWidth: 'none', marginInline: 0 } as const;

type PackIsraelShipmentItemsFormModalText = {
  title: string;
  description: string;
  boxLabel: string;
  boxPlaceholder: string;
  boxLoadingLabel: string;
  boxNoMatchesLabel: string;
  unassignedGroupLabel: string;
  shipmentGroupLabel: (shipmentNumber: number) => string;
  noBoxSelectedHint: string;
  shipmentDisplayLabel: string;
  boxNumberDisplayLabel: string;
  statusDisplayLabel: string;
  itemsInBoxDisplayLabel: string;
  boxNotesDisplayLabel: string;
  unassignedShipmentValue: string;
  categoryLabel: string;
  categoryPlaceholder: string;
  pitamStatusColumnLabel: string;
  noGradeColumnLabel: string;
  quantityPlaceholder: string;
  availableQuantityHint: (n: number) => string;
  existingQuantityHint: (n: number) => string;
  addExistingItemQuantityLabel: string;
  cancelExistingItemEditLabel: string;
  addExistingItemQuantityPopupTitle: string;
  addExistingItemQuantityPopupPrefix: string;
  addExistingItemQuantityPopupGradeWord: string;
  addExistingItemQuantityPopupInstruction: string;
  addExistingItemQuantityConfirmLabel: string;
  addExistingItemQuantityInvalidError: string;
  existingItemQuantityAddModeLabel: string;
  existingItemQuantitySubtractModeLabel: string;
  subtractExistingItemQuantityConfirmLabel: string;
  subtractExistingItemQuantityInvalidError: string;
  subtractExistingItemQuantityExceedsBaseError: (n: number) => string;
  addExistingItemQuantityAvailableHint: (n: number) => string;
  addExistingItemQuantityExceedsAvailableError: (n: number) => string;
  subtractExistingItemQuantityToZeroHint: string;
  cellQuantityExceedsAvailableHint: (n: number) => string;
  notesLabel: string;
  notesPlaceholder: string;
  save: string;
  saving: string;
  cancel: string;
  itemRows: {
    title: string;
    addRow: string;
    removeRow: string;
    rowPrefix: (index: number) => string;
    emptyHint: string;
    addRowDisabledHint: string;
    totalPackedQuantityLabel: string;
    remainingCapacityHint: (n: number) => string;
    pendingRemovedItemRowsTitle: string;
    pendingRemovedItemRowsHint: string;
    restorePendingRemovedItemRow: string;
  };
};

type PackIsraelShipmentItemsFormModalProps = {
  isOpen: boolean;
  t: PackIsraelShipmentItemsFormModalText;
  pitamStatusLabels: Record<IsraelPitamStatus, string>;
  boxStatusLabels: Record<IsraelBoxStatus, string>;
  boxes: IsraelBoxRecord[];
  shipments: IsraelShipmentRecord[];
  sortCategories: IsraelSortCategory[];
  allSortCategories: IsraelSortCategory[];
  isLoadingOptions: boolean;
  boxId: string;
  onBoxIdChange: (v: string) => void;
  selectedBox: IsraelBoxRecord | null;
  onBoxStatusChange: (v: IsraelBoxStatus) => void;
  onBoxShipmentChange: (v: string) => void;
  boxNotesDraft: string;
  onBoxNotesChange: (v: string) => void;
  onBoxNotesBlur: () => void;
  rows: PackIsraelShipmentItemRowDraft[];
  removedRows: PackIsraelShipmentItemRowDraft[];
  onAddRow: () => void;
  onRemoveRow: (rowId: string) => void;
  onRestoreRow: (rowId: string) => void;
  onRowCategoryChange: (rowId: string, categoryId: string) => void;
  onRowNotesChange: (rowId: string, notes: string) => void;
  onCellQuantityChange: (rowId: string, grade: string, pitamStatus: IsraelPitamStatus, value: string) => void;
  availableFor: (categoryId: number, grade: string, pitamStatus: IsraelPitamStatus) => number;
  existingItemFor: (categoryId: number, grade: string, pitamStatus: IsraelPitamStatus) => IsraelShipmentItemRecord | null;
  pendingExistingItemEdits: Record<number, string>;
  onStageExistingItemEdit: (itemId: number, value: string | null) => void;
  totalPackedQuantity: number;
  remainingCapacity: number | null;
  isBoxOverCapacity: boolean;
  boxOverCapacityMessage: string | null;
  isSubmitting: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
};

export function PackIsraelShipmentItemsFormModal({
  isOpen,
  t,
  pitamStatusLabels,
  boxStatusLabels,
  boxes,
  shipments,
  sortCategories,
  allSortCategories,
  isLoadingOptions,
  boxId,
  onBoxIdChange,
  selectedBox,
  onBoxStatusChange,
  onBoxShipmentChange,
  boxNotesDraft,
  onBoxNotesChange,
  onBoxNotesBlur,
  rows,
  removedRows,
  onAddRow,
  onRemoveRow,
  onRestoreRow,
  onRowCategoryChange,
  onRowNotesChange,
  onCellQuantityChange,
  availableFor,
  existingItemFor,
  pendingExistingItemEdits,
  onStageExistingItemEdit,
  totalPackedQuantity,
  remainingCapacity,
  isBoxOverCapacity,
  boxOverCapacityMessage,
  isSubmitting,
  error,
  onSave,
  onClose,
}: PackIsraelShipmentItemsFormModalProps): JSX.Element | null {
  const [didTryAddRow, setDidTryAddRow] = useState(false);
  const [addQuantityCell, setAddQuantityCell] = useState<{
    itemId: number;
    baseQuantity: number;
    available: number;
    categoryName: string;
    gradeLabel: string;
    pitamLabel: string;
  } | null>(null);
  const [addQuantityValue, setAddQuantityValue] = useState('');
  const [addQuantityError, setAddQuantityError] = useState('');
  const [addQuantityMode, setAddQuantityMode] = useState<'add' | 'subtract'>('add');

  // Fixed column set across all rows/categories (ordered by the canonical grade list, with any
  // category-specific extras appended, and the "no grade" column always included) so the matrix
  // width never changes when the user picks a category — unsupported grades just render disabled
  // instead of disappearing. "No grade" is always active regardless of category, since ungraded
  // stock can exist for any category.
  const allGrades = useMemo(() => {
    const set = new Set<string>();
    for (const category of sortCategories) {
      for (const grade of category.supportedGrades) set.add(grade);
    }
    const ordered = HARVEST_GRADE_OPTIONS.filter((grade) => set.has(grade));
    const extras = [...set].filter(
      (grade) => !(HARVEST_GRADE_OPTIONS as readonly string[]).includes(grade) && grade !== t.noGradeColumnLabel,
    );
    return [...ordered, ...extras, t.noGradeColumnLabel];
  }, [sortCategories, t.noGradeColumnLabel]);

  const lastRow = rows[rows.length - 1];
  const lastRowCategory = lastRow ? sortCategories.find((category) => String(category.id) === lastRow.categoryId) : undefined;
  const lastRowHasQuantityInMatrix = lastRow
    ? Object.values(lastRow.quantities).some((value) => Number(value) > 0)
    : false;
  const lastRowHasExistingItem = lastRow && lastRowCategory
    ? allGrades.some((grade) =>
        PITAM_STATUSES.some((pitamStatus) => existingItemFor(lastRowCategory.id, grade, pitamStatus) !== null),
      )
    : false;
  const canAddRow = !lastRow || (Boolean(lastRow.categoryId) && (lastRowHasQuantityInMatrix || lastRowHasExistingItem));

  const handleAddRowClick = () => {
    if (!canAddRow) {
      setDidTryAddRow(true);
      return;
    }
    setDidTryAddRow(false);
    onAddRow();
  };

  const handleOpenAddQuantityPopup = (params: {
    itemId: number;
    baseQuantity: number;
    available: number;
    categoryName: string;
    gradeLabel: string;
    pitamLabel: string;
  }) => {
    setAddQuantityCell(params);
    setAddQuantityValue('');
    setAddQuantityError('');
    setAddQuantityMode('add');
  };

  const handleCloseAddQuantityPopup = () => {
    setAddQuantityCell(null);
    setAddQuantityValue('');
    setAddQuantityError('');
    setAddQuantityMode('add');
  };

  const handleConfirmAddQuantity = () => {
    if (!addQuantityCell) return;
    const isSubtractMode = addQuantityMode === 'subtract';
    const parsedQuantity = Number(addQuantityValue);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setAddQuantityError(
        isSubtractMode ? t.subtractExistingItemQuantityInvalidError : t.addExistingItemQuantityInvalidError,
      );
      return;
    }
    if (isSubtractMode && parsedQuantity > addQuantityCell.baseQuantity) {
      setAddQuantityError(t.subtractExistingItemQuantityExceedsBaseError(addQuantityCell.baseQuantity));
      return;
    }
    if (!isSubtractMode && parsedQuantity > addQuantityCell.available) {
      setAddQuantityError(t.addExistingItemQuantityExceedsAvailableError(addQuantityCell.available));
      return;
    }
    const newTotal = isSubtractMode
      ? addQuantityCell.baseQuantity - parsedQuantity
      : addQuantityCell.baseQuantity + parsedQuantity;
    onStageExistingItemEdit(addQuantityCell.itemId, String(newTotal));
    handleCloseAddQuantityPopup();
  };

  const handleRevertCellEdit = (itemId: number) => {
    onStageExistingItemEdit(itemId, null);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog modal-dialog--form"
        style={{ width: 'min(1040px, 94vw)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" type="button" aria-label={t.cancel} onClick={onClose}>
          <FaXmark />
        </button>

        <h3 className="modal-title" style={{ position: 'relative' }}>
          {t.title}
          <TopLoadingBar isLoading={isLoadingOptions} />
        </h3>
        <p className="modal-message">{t.description}</p>

        <div className={boxFormStyles.formGrid}>
          <div className={styles.topRow}>
            <div className={styles.field} style={STRETCH_FIELD_STYLE}>
              <label className={boxFormStyles.label}>{t.boxLabel}</label>
              <IsraelBoxNumberTypeahead
                options={boxes.map((box) => ({ id: box.id, boxNumber: box.boxNumber, shipmentNumber: box.shipment?.shipmentNumber ?? null }))}
                unassignedGroupLabel={t.unassignedGroupLabel}
                shipmentGroupLabel={t.shipmentGroupLabel}
                value={boxId}
                onChange={onBoxIdChange}
                placeholder={t.boxPlaceholder}
                loadingLabel={t.boxLoadingLabel}
                noMatchesLabel={t.boxNoMatchesLabel}
                isLoading={isLoadingOptions}
              />
            </div>

            <div className={styles.field} style={STRETCH_FIELD_STYLE}>
              <label className={boxFormStyles.label}>{t.shipmentDisplayLabel}</label>
              <CustomSelect
                className="seasons-manager__year-input"
                value={selectedBox?.shipment ? String(selectedBox.shipment.id) : ''}
                onChange={onBoxShipmentChange}
                disabled={!selectedBox}
                placeholder={t.boxPlaceholder}
                options={[
                  { value: '', label: t.unassignedShipmentValue },
                  ...shipments.map((shipment) => ({ value: String(shipment.id), label: String(shipment.shipmentNumber) })),
                ]}
              />
            </div>

            <div className={styles.field} style={STRETCH_FIELD_STYLE}>
              <label className={boxFormStyles.label}>{t.boxNumberDisplayLabel}</label>
              <input
                className="seasons-manager__year-input"
                type="text"
                disabled
                readOnly
                value={selectedBox ? String(selectedBox.boxNumber) : ''}
                placeholder={t.boxPlaceholder}
              />
            </div>

            <div className={styles.field} style={STRETCH_FIELD_STYLE}>
              <label className={boxFormStyles.label}>{t.statusDisplayLabel}</label>
              <CustomSelect
                className="seasons-manager__year-input"
                value={selectedBox ? selectedBox.status : ''}
                onChange={(value) => onBoxStatusChange(value as IsraelBoxStatus)}
                disabled={!selectedBox}
                placeholder={t.boxPlaceholder}
                options={BOX_STATUSES.map((s) => ({ value: s, label: boxStatusLabels[s] }))}
              />
            </div>
          </div>

          <div className={styles.secondRow}>
            <div className={styles.field} style={STRETCH_FIELD_STYLE}>
              <label className={boxFormStyles.label}>{t.itemsInBoxDisplayLabel}</label>
              <input
                className="seasons-manager__year-input"
                type="text"
                disabled
                readOnly
                value={selectedBox ? String(selectedBox.itemsCount) : ''}
              />
            </div>

            <div className={styles.field} style={STRETCH_FIELD_STYLE}>
              <label className={boxFormStyles.label}>{t.boxNotesDisplayLabel}</label>
              <input
                className="seasons-manager__year-input"
                type="text"
                disabled={!selectedBox}
                value={boxNotesDraft}
                onChange={(e) => onBoxNotesChange(e.target.value)}
                onBlur={onBoxNotesBlur}
                placeholder={t.notesPlaceholder}
              />
            </div>
          </div>
        </div>

        {!selectedBox ? <p className="seasons-manager__hint" style={{ margin: 0 }}>{t.noBoxSelectedHint}</p> : null}

        <div className={styles.rowsSection}>
          <div className={styles.rowsSectionHead}>
            <h4 className={styles.rowsTitle}>{t.itemRows.title}</h4>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
              {selectedBox && remainingCapacity !== null ? (
                <span className={styles.availableHint}>{t.itemRows.remainingCapacityHint(remainingCapacity)}</span>
              ) : null}
              {rows.length === 0 ? (
                <button type="button" className="btn btn-primary" onClick={onAddRow} disabled={!selectedBox}>
                  {t.itemRows.addRow}
                </button>
              ) : null}
            </div>
          </div>

          {rows.length === 0 ? <p className={styles.rowsEmptyHint}>{t.itemRows.emptyHint}</p> : null}

          {selectedBox
            ? rows.map((row, index) => {
              const selectedCategory = sortCategories.find((category) => String(category.id) === row.categoryId);

              return (
                <div key={row.id} style={{ padding: '0.75rem 0', marginBottom: '0.75rem' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>{t.itemRows.rowPrefix(index)}</strong>
                  </div>

                  <div className={styles.topRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>{t.categoryLabel}</label>
                      <CustomSelect
                        className="seasons-manager__year-input"
                        value={row.categoryId}
                        onChange={(value) => onRowCategoryChange(row.id, value)}
                        placeholder={t.categoryPlaceholder}
                        options={sortCategories.map((category) => ({ value: String(category.id), label: category.name }))}
                      />
                    </div>
                  </div>

                  {(() => {
                    return (
                    <div className={styles.quantityMatrix}>
                      <table className={styles.quantityMatrixTable}>
                        <thead>
                          <tr>
                            <th>{t.pitamStatusColumnLabel}</th>
                            {allGrades.map((grade) => (
                              <th key={grade}>{grade}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {PITAM_STATUSES.map((pitamStatus) => (
                            <tr key={pitamStatus}>
                              <th>{pitamStatusLabels[pitamStatus]}</th>
                              {allGrades.map((grade) => {
                                const isGradeSupported =
                                  grade === t.noGradeColumnLabel || Boolean(selectedCategory?.supportedGrades.includes(grade));
                                if (!selectedCategory || !isGradeSupported) {
                                  return (
                                    <td key={grade}>
                                      <input className="seasons-manager__year-input" type="number" disabled value="" />
                                    </td>
                                  );
                                }

                                const existingItem = existingItemFor(selectedCategory.id, grade, pitamStatus);
                                const available = availableFor(selectedCategory.id, grade, pitamStatus);

                                if (existingItem) {
                                  const pendingValue = pendingExistingItemEdits[existingItem.id];
                                  const hasPendingEdit = pendingValue !== undefined;
                                  return (
                                    <td key={grade}>
                                      <div className={styles.existingCellWrapper}>
                                        <input
                                          className="seasons-manager__year-input"
                                          type="number"
                                          min={1}
                                          step={1}
                                          disabled
                                          readOnly
                                          value={pendingValue ?? existingItem.quantity}
                                          onWheel={(e) => e.currentTarget.blur()}
                                          title={t.existingQuantityHint(Number(pendingValue ?? existingItem.quantity))}
                                        />
                                        {!hasPendingEdit ? (
                                          <button
                                            type="button"
                                            className={styles.existingCellActionButton}
                                            onClick={() =>
                                              handleOpenAddQuantityPopup({
                                                itemId: existingItem.id,
                                                baseQuantity: existingItem.quantity,
                                                available,
                                                categoryName: selectedCategory.name,
                                                gradeLabel: grade,
                                                pitamLabel: pitamStatusLabels[pitamStatus],
                                              })
                                            }
                                            aria-label={t.addExistingItemQuantityLabel}
                                            title={t.addExistingItemQuantityLabel}
                                          >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
                                              <path d="M12 5v14M5 12h14" />
                                            </svg>
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            className={styles.existingCellActionButton}
                                            onClick={() => handleRevertCellEdit(existingItem.id)}
                                            aria-label={t.cancelExistingItemEditLabel}
                                            title={t.cancelExistingItemEditLabel}
                                          >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
                                              <path d="M6 6l12 12M18 6l-12 12" />
                                            </svg>
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  );
                                }

                                const enteredRaw = row.quantities[`${grade}|${pitamStatus}`] ?? '';
                                const enteredQuantity = Number(enteredRaw);
                                const room = available + (Number.isFinite(enteredQuantity) ? enteredQuantity : 0);
                                const isEnabled = room > 0;
                                const exceedsAvailable = enteredRaw.trim() !== '' && Number.isFinite(enteredQuantity) && enteredQuantity > room;

                                return (
                                  <td key={grade}>
                                    <input
                                      className="seasons-manager__year-input"
                                      type="number"
                                      min={1}
                                      max={room || undefined}
                                      step={1}
                                      disabled={!isEnabled}
                                      value={enteredRaw}
                                      onChange={(e) => onCellQuantityChange(row.id, grade, pitamStatus, e.target.value)}
                                      onWheel={(e) => e.currentTarget.blur()}
                                      placeholder={t.availableQuantityHint(room)}
                                      title={
                                        exceedsAvailable
                                          ? t.cellQuantityExceedsAvailableHint(room)
                                          : isEnabled
                                            ? t.availableQuantityHint(room)
                                            : undefined
                                      }
                                      aria-label={`${t.categoryLabel} ${selectedCategory.name} ${grade} ${pitamStatusLabels[pitamStatus]}`}
                                      style={exceedsAvailable ? { borderColor: '#dc2626' } : undefined}
                                    />
                                    {exceedsAvailable ? (
                                      <span style={{ color: '#dc2626', fontSize: '0.75rem', display: 'block' }}>
                                        {t.cellQuantityExceedsAvailableHint(room)}
                                      </span>
                                    ) : null}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    );
                  })()}

                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
                    <div className={`${styles.field} ${styles.fieldFull}`}>
                      <label className={styles.label}>{t.notesLabel}</label>
                      <textarea
                        className={`seasons-manager__year-input ${styles.textarea}`}
                        value={row.notes}
                        onChange={(e) => onRowNotesChange(row.id, e.target.value)}
                        placeholder={t.notesPlaceholder}
                        rows={1}
                      />
                    </div>

                    {index === rows.length - 1 ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleAddRowClick}
                        style={{ flexShrink: 0 }}
                      >
                        {t.itemRows.addRow}
                      </button>
                    ) : null}

                    <button type="button" className="btn btn-danger" onClick={() => onRemoveRow(row.id)} style={{ flexShrink: 0 }}>
                      <FaTrashCan />
                      <span>{t.itemRows.removeRow}</span>
                    </button>
                  </div>

                  {index === rows.length - 1 && didTryAddRow && !canAddRow ? (
                    <p className="seasons-manager__error" style={{ margin: '0.5rem 0 0' }}>{t.itemRows.addRowDisabledHint}</p>
                  ) : null}
                </div>
              );
            })
            : null}

          {totalPackedQuantity > 0 ? (
            <div className={styles.totalPackedSummary}>
              <span>{t.itemRows.totalPackedQuantityLabel}</span>
              <span>{totalPackedQuantity.toLocaleString()}</span>
            </div>
          ) : null}

          {boxOverCapacityMessage ? (
            <p className="seasons-manager__error" style={{ margin: '0.5rem 0 0' }}>{boxOverCapacityMessage}</p>
          ) : null}

          {removedRows.length ? (
            <div style={{ marginTop: '1rem' }}>
              <h4 className={styles.rowsTitle}>{t.itemRows.pendingRemovedItemRowsTitle}</h4>
              <p className={styles.rowsEmptyHint}>{t.itemRows.pendingRemovedItemRowsHint}</p>
              {removedRows.map((row) => {
                const categoryName =
                  allSortCategories.find((category) => String(category.id) === row.categoryId)?.name ??
                  row.categoryId;
                return (
                  <div
                    key={row.id}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}
                  >
                    <span>{categoryName}</span>
                    <button type="button" className="btn btn-secondary" onClick={() => onRestoreRow(row.id)}>
                      {t.itemRows.restorePendingRemovedItemRow}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {error ? <p className="seasons-manager__error">{error}</p> : null}

        <div className="modal-actions">
          <button className="btn btn-danger" type="button" onClick={onClose}>
            {t.cancel}
          </button>
          <SubmitButton
            className="btn btn-success"
            onClick={onSave}
            disabled={isLoadingOptions || !selectedBox || isBoxOverCapacity}
            isLoading={isSubmitting}
            loadingText={t.saving}
          >
            {t.save}
          </SubmitButton>
        </div>
      </div>

      {addQuantityCell
        ? createPortal(
            <div className="modal-overlay" onClick={handleCloseAddQuantityPopup}>
              <div
                className={`modal-dialog modal-dialog--form ${styles.addQuantityDialog}`}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  className="modal-close"
                  type="button"
                  aria-label={t.cancel}
                  onClick={handleCloseAddQuantityPopup}
                >
                  <FaXmark />
                </button>

                <h3 className="modal-title">{t.addExistingItemQuantityPopupTitle}</h3>

                <p className="modal-message">
                  {t.addExistingItemQuantityPopupPrefix} <strong>{addQuantityCell.categoryName}</strong>
                  {' '}
                  {t.addExistingItemQuantityPopupGradeWord} <strong>{addQuantityCell.gradeLabel}</strong>
                  {' '}
                  <strong>{addQuantityCell.pitamLabel}</strong>
                  : <strong>{addQuantityCell.baseQuantity}</strong>.
                  <br />
                  {t.addExistingItemQuantityPopupInstruction}
                </p>

                <div className={styles.addQuantityModeToggle}>
                  <button
                    type="button"
                    className={`btn ${addQuantityMode === 'add' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      setAddQuantityMode('add');
                      setAddQuantityError('');
                    }}
                  >
                    {t.existingItemQuantityAddModeLabel}
                  </button>
                  <button
                    type="button"
                    className={`btn ${addQuantityMode === 'subtract' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      setAddQuantityMode('subtract');
                      setAddQuantityError('');
                    }}
                  >
                    {t.existingItemQuantitySubtractModeLabel}
                  </button>
                </div>

                {addQuantityMode === 'add' ? (
                  <p className="modal-message">
                    {t.addExistingItemQuantityAvailableHint(addQuantityCell.available)}
                  </p>
                ) : (
                  <p className="modal-message">{t.subtractExistingItemQuantityToZeroHint}</p>
                )}

                <div className={styles.addQuantityInputRow}>
                  <input
                    className="seasons-manager__year-input"
                    type="number"
                    min="0"
                    max={addQuantityMode === 'add' ? addQuantityCell.available : addQuantityCell.baseQuantity}
                    autoFocus
                    value={addQuantityValue}
                    onChange={(event) => {
                      setAddQuantityValue(event.target.value);
                      setAddQuantityError('');
                    }}
                    placeholder={t.quantityPlaceholder}
                    aria-label={t.addExistingItemQuantityPopupTitle}
                  />
                </div>
                {addQuantityError ? <p className="seasons-manager__error">{addQuantityError}</p> : null}

                <div className="modal-actions">
                  <button className="btn btn-danger" type="button" onClick={handleCloseAddQuantityPopup}>
                    {t.cancel}
                  </button>
                  <SubmitButton
                    className="btn btn-success"
                    onClick={handleConfirmAddQuantity}
                    isLoading={false}
                    loadingText={
                      addQuantityMode === 'subtract'
                        ? t.subtractExistingItemQuantityConfirmLabel
                        : t.addExistingItemQuantityConfirmLabel
                    }
                  >
                    {addQuantityMode === 'subtract'
                      ? t.subtractExistingItemQuantityConfirmLabel
                      : t.addExistingItemQuantityConfirmLabel}
                  </SubmitButton>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
