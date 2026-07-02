import { FaXmark } from 'react-icons/fa6';
import { SubmitButton } from '../../../components/ui/SubmitButton';

type EditShipmentItemFormModalText = {
  title: (id: number) => string;
  boxNumberLabel: string;
  boxTypeLabel: string;
  boxTotalQuantityLabel: string;
  boxTypeLabels: Record<string, string>;
  ownershipLabel: string;
  stockSourceLabel: string;
  stockSourceLabels: { GENERAL: string; PRIVATE_SELECTION: string };
  categoryLabel: string;
  gradeLabel: string;
  pitamStatusLabel: string;
  pitamStatusLabels: Record<string, string>;
  quantityLabel: string;
  quantityPlaceholder: string;
  quantityAvailableHint: (n: number) => string;
  quantityBoxRemainingHint: (n: number) => string;
  notesLabel: string;
  notesPlaceholder: string;
  save: string;
  saving: string;
  cancel: string;
  loading: string;
};

type EditShipmentItemFormModalProps = {
  isOpen: boolean;
  t: EditShipmentItemFormModalText;
  itemId: number;
  boxNumber: number;
  boxType: string;
  boxTotalQuantity: number;
  category: string;
  ownership: string;
  grade: string;
  isPrivateSelection: boolean;
  pitamStatus: string;
  maxQuantity: number | null;
  inventoryAvailable: number | null;
  boxSpaceFree: number | null;
  quantity: string;
  onQuantityChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
};

const infoStyle: React.CSSProperties = {
  padding: '0.4rem 0.6rem',
  background: 'var(--color-bg-subtle, #f5f5f5)',
  borderRadius: 4,
  fontSize: '0.9rem',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: '1rem',
};

export function EditShipmentItemFormModal({
  isOpen,
  t,
  itemId,
  boxNumber,
  boxType,
  boxTotalQuantity,
  category,
  ownership,
  grade,
  isPrivateSelection,
  pitamStatus,
  maxQuantity,
  inventoryAvailable,
  boxSpaceFree,
  quantity,
  onQuantityChange,
  notes,
  onNotesChange,
  isLoading,
  isSubmitting,
  error,
  onSave,
  onClose,
}: EditShipmentItemFormModalProps): JSX.Element | null {
  if (!isOpen) return null;

  const isBusy = isLoading || isSubmitting;
  const stockSourceLabel = isPrivateSelection
    ? t.stockSourceLabels.PRIVATE_SELECTION
    : t.stockSourceLabels.GENERAL;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog modal-dialog--form" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" type="button" aria-label={t.cancel} onClick={onClose}>
          <FaXmark />
        </button>

        <h3 className="modal-title">{t.title(itemId)}</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          {/* Row 1: Box number | Box type | Box total quantity */}
          <div style={gridStyle}>
            <div>
              <label className="seasons-manager__label">{t.boxNumberLabel}</label>
              <div style={infoStyle}>{boxNumber}</div>
            </div>
            <div>
              <label className="seasons-manager__label">{t.boxTypeLabel}</label>
              <div style={infoStyle}>{(t.boxTypeLabels[boxType] ?? boxType) || '—'}</div>
            </div>
            <div>
              <label className="seasons-manager__label">{t.boxTotalQuantityLabel}</label>
              <div style={infoStyle}>{boxTotalQuantity.toLocaleString()}</div>
            </div>
          </div>

          {/* Row 2: Ownership | Stock source */}
          <div style={gridStyle}>
            <div>
              <label className="seasons-manager__label">{t.ownershipLabel}</label>
              <div style={infoStyle}>{ownership}</div>
            </div>
            <div>
              <label className="seasons-manager__label">{t.stockSourceLabel}</label>
              <div style={infoStyle}>{stockSourceLabel}</div>
            </div>
          </div>

          {/* Row 3: Category | Grade | Pitam status */}
          <div style={gridStyle}>
            <div>
              <label className="seasons-manager__label">{t.categoryLabel}</label>
              <div style={infoStyle}>{category}</div>
            </div>
            <div>
              <label className="seasons-manager__label">{t.gradeLabel}</label>
              <div style={infoStyle}>{grade || '—'}</div>
            </div>
            <div>
              <label className="seasons-manager__label">{t.pitamStatusLabel}</label>
              <div style={infoStyle}>
                {pitamStatus ? (t.pitamStatusLabels[pitamStatus] ?? pitamStatus) : '—'}
              </div>
            </div>
          </div>

          {/* Row 4: Quantity (editable) | Notes (editable, span 2) */}
          <div style={gridStyle}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label className="seasons-manager__label">{t.quantityLabel}</label>
              <input
                className="seasons-manager__year-input"
                type="number"
                min={1}
                max={maxQuantity ?? undefined}
                step={1}
                value={quantity}
                onChange={(e) => onQuantityChange(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder={t.quantityPlaceholder}
                disabled={isBusy}
                autoFocus
              />
              {(inventoryAvailable !== null || boxSpaceFree !== null) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', marginTop: '0.2rem' }}>
                  {inventoryAvailable !== null && (
                    <span style={{ fontSize: '0.78rem', opacity: 0.65 }}>
                      {t.quantityAvailableHint(inventoryAvailable)}
                    </span>
                  )}
                  {boxSpaceFree !== null && (
                    <span style={{ fontSize: '0.78rem', opacity: 0.65 }}>
                      {t.quantityBoxRemainingHint(boxSpaceFree)}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="seasons-manager__label">{t.notesLabel}</label>
              <textarea
                className="seasons-manager__year-input"
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = `${el.scrollHeight}px`;
                }}
                placeholder={t.notesPlaceholder}
                rows={2}
                style={{ resize: 'none', width: '100%' }}
                disabled={isBusy}
              />
            </div>
          </div>
        </div>

        {isLoading && <p style={{ textAlign: 'center', marginTop: '0.5rem', opacity: 0.6 }}>{t.loading}</p>}
        {error ? <p className="seasons-manager__error">{error}</p> : null}

        <div className="modal-actions">
          <button className="btn btn-danger" type="button" onClick={onClose}>
            {t.cancel}
          </button>
          <SubmitButton
            className="btn btn-success"
            onClick={onSave}
            disabled={isLoading}
            isLoading={isSubmitting}
            loadingText={t.saving}
          >
            {t.save}
          </SubmitButton>
        </div>
      </div>
    </div>
  );
}
