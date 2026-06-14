import { FaXmark } from 'react-icons/fa6';
import type { BoxStatus } from '../../../services/boxesApi';
import type { ShipmentRecord } from '../../../services/shipmentsApi';
import type { Trader } from '../../../services/tradersApi';
import type { Customer } from '../../../services/customersApi';
import styles from './styles/NewBoxFormModal.module.css';

const infoStyle: React.CSSProperties = {
  width: 240,
  maxWidth: '100%',
  minHeight: 42,
  padding: '0.4rem 0.6rem',
  background: 'var(--color-bg-subtle, #f5f5f5)',
  borderRadius: 4,
  fontSize: '0.9rem',
  display: 'flex',
  alignItems: 'center',
};

type BoxType = 'SMALL' | 'MEDIUM' | 'LARGE' | 'CUSTOM';
type BoxOwnership = 'UNASSIGNED' | 'TRADER' | 'CUSTOMER' | 'SHARED' | 'CUSTOM';

type EditBoxFormModalText = {
  title: (num: number) => string;
  shipmentLabel: string;
  shipmentPlaceholder: string;
  boxNumberLabel: string;
  boxNumberPlaceholder: string;
  statusLabel: string;
  boxTypeLabel: string;
  boxTypePlaceholder: string;
  ownershipTypeLabel: string;
  ownershipTypePlaceholder: string;
  ownershipLockedHint: string;
  traderLabel: string;
  traderPlaceholder: string;
  customerLabel: string;
  customerPlaceholder: string;
  notesLabel: string;
  notesPlaceholder: string;
  save: string;
  cancel: string;
  statusOptions: Record<BoxStatus, string>;
  boxTypeOptions: Record<BoxType, string>;
  ownershipTypeOptions: Record<BoxOwnership, string>;
};

type EditBoxFormModalProps = {
  isOpen: boolean;
  originalBoxNumber: number;
  t: EditBoxFormModalText;
  shipments: ShipmentRecord[];
  traders: Trader[];
  customers: Customer[];
  isLoadingOptions: boolean;
  hasItems: boolean;
  selectedShipmentId: string;
  onShipmentIdChange: (v: string) => void;
  boxNumber: string;
  onBoxNumberChange: (v: string) => void;
  status: BoxStatus;
  onStatusChange: (v: BoxStatus) => void;
  boxType: string;
  onBoxTypeChange: (v: string) => void;
  ownershipType: string;
  onOwnershipTypeChange: (v: string) => void;
  traderId: string;
  onTraderIdChange: (v: string) => void;
  customerId: string;
  onCustomerIdChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  isShipped: boolean;
  isSubmitting: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
};

const BOX_STATUSES: BoxStatus[] = ['OPEN', 'CLOSED', 'SHIPPED'];
const BOX_TYPES: BoxType[] = ['SMALL', 'MEDIUM', 'LARGE', 'CUSTOM'];
const OWNERSHIP_TYPES: BoxOwnership[] = ['UNASSIGNED', 'TRADER', 'CUSTOMER', 'SHARED', 'CUSTOM'];

export function EditBoxFormModal({
  isOpen,
  originalBoxNumber,
  t,
  shipments,
  traders,
  customers,
  isLoadingOptions,
  hasItems,
  selectedShipmentId,
  onShipmentIdChange,
  boxNumber,
  onBoxNumberChange,
  status,
  onStatusChange,
  boxType,
  onBoxTypeChange,
  ownershipType,
  onOwnershipTypeChange,
  traderId,
  onTraderIdChange,
  customerId,
  onCustomerIdChange,
  notes,
  onNotesChange,
  isShipped,
  isSubmitting,
  error,
  onSave,
  onClose,
}: EditBoxFormModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog modal-dialog--form" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" type="button" aria-label={t.cancel} onClick={onClose}>
          <FaXmark />
        </button>

        <h3 className="modal-title">{t.title(originalBoxNumber)}</h3>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>{t.shipmentLabel}</label>
            <select
              className="seasons-manager__year-input"
              value={selectedShipmentId}
              onChange={(e) => onShipmentIdChange(e.target.value)}
              disabled={isLoadingOptions}
            >
              <option value="">{t.shipmentPlaceholder}</option>
              {shipments.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.shipmentNumber}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t.boxNumberLabel}</label>
            <input
              className="seasons-manager__year-input"
              type="number"
              min={1}
              step={1}
              value={boxNumber}
              onChange={(e) => onBoxNumberChange(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder={t.boxNumberPlaceholder}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t.statusLabel}</label>
            <select
              className="seasons-manager__year-input"
              value={status}
              onChange={(e) => onStatusChange(e.target.value as BoxStatus)}
            >
              {BOX_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t.statusOptions[s]}
                </option>
              ))}
            </select>
          </div>

          {!isShipped ? (
            <>
              <div className={styles.field}>
                <label className={styles.label}>{t.boxTypeLabel}</label>
                <select
                  className="seasons-manager__year-input"
                  value={boxType}
                  onChange={(e) => onBoxTypeChange(e.target.value)}
                >
                  <option value="">{t.boxTypePlaceholder}</option>
                  {BOX_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t.boxTypeOptions[type]}
                    </option>
                  ))}
                </select>
              </div>

              <p
                className="seasons-manager__hint"
                style={{
                  gridColumn: '1 / -1',
                  visibility: !isLoadingOptions && hasItems ? 'visible' : 'hidden',
                  margin: 0,
                }}
              >
                {t.ownershipLockedHint}
              </p>

              <div className={styles.field}>
                <label className={styles.label}>{t.ownershipTypeLabel}</label>
                {hasItems ? (
                  <div style={infoStyle}>
                    {t.ownershipTypeOptions[ownershipType as BoxOwnership] || ownershipType || '—'}
                  </div>
                ) : (
                  <select
                    className="seasons-manager__year-input"
                    value={ownershipType}
                    onChange={(e) => onOwnershipTypeChange(e.target.value)}
                  >
                    <option value="">{t.ownershipTypePlaceholder}</option>
                    {OWNERSHIP_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t.ownershipTypeOptions[type]}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {ownershipType === 'TRADER' ? (
                <div className={styles.field}>
                  <label className={styles.label}>{t.traderLabel}</label>
                  {hasItems ? (
                    <div style={infoStyle}>
                      {traders.find((tr) => String(tr.id) === traderId)?.name || traderId || '—'}
                    </div>
                  ) : (
                    <select
                      className="seasons-manager__year-input"
                      value={traderId}
                      onChange={(e) => onTraderIdChange(e.target.value)}
                      disabled={isLoadingOptions}
                    >
                      <option value="">{t.traderPlaceholder}</option>
                      {traders.map((trader) => (
                        <option key={trader.id} value={String(trader.id)}>
                          {trader.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : null}

              {ownershipType === 'CUSTOMER' ? (
                <div className={styles.field}>
                  <label className={styles.label}>{t.customerLabel}</label>
                  {hasItems ? (
                    <div style={infoStyle}>
                      {customers.find((c) => String(c.id) === customerId)?.customerName || customerId || '—'}
                    </div>
                  ) : (
                    <select
                      className="seasons-manager__year-input"
                      value={customerId}
                      onChange={(e) => onCustomerIdChange(e.target.value)}
                      disabled={isLoadingOptions}
                    >
                      <option value="">{t.customerPlaceholder}</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={String(customer.id)}>
                          {customer.customerName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : null}
            </>
          ) : null}

          <div className={styles.field}>
            <label className={styles.label}>{t.notesLabel}</label>
            <textarea
              className={`seasons-manager__year-input ${styles.textarea}`}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${el.scrollHeight}px`;
              }}
              placeholder={t.notesPlaceholder}
              rows={1}
            />
          </div>
        </div>

        {error ? <p className="seasons-manager__error">{error}</p> : null}

        <div className="modal-actions">
          <button className="btn btn-danger" type="button" onClick={onClose}>
            {t.cancel}
          </button>
          <button
            className="btn btn-success"
            type="button"
            onClick={onSave}
            disabled={isSubmitting || isLoadingOptions}
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
