import { FaXmark } from 'react-icons/fa6';
import type { BoxOwnership } from '../../../services/boxesApi';
import type { ShipmentRecord } from '../../../services/shipmentsApi';
import type { Trader } from '../../../services/tradersApi';
import type { Customer } from '../../../services/customersApi';
import styles from './styles/NewBoxFormModal.module.css';

type BoxType = 'SMALL' | 'MEDIUM' | 'LARGE' | 'CUSTOM';

type NewBoxFormModalText = {
  title: string;
  description: string;
  shipmentNumberLabel: string;
  shipmentNumberPlaceholder: string;
  boxNumberLabel: string;
  boxNumberPlaceholder: string;
  boxTypeLabel: string;
  boxTypePlaceholder: string;
  ownershipTypeLabel: string;
  ownershipTypePlaceholder: string;
  traderLabel: string;
  traderPlaceholder: string;
  customerLabel: string;
  customerPlaceholder: string;
  notesLabel: string;
  notesPlaceholder: string;
  save: string;
  cancel: string;
  boxTypeOptions: Record<BoxType, string>;
  ownershipTypeOptions: Record<BoxOwnership, string>;
};

type NewBoxFormModalProps = {
  isOpen: boolean;
  t: NewBoxFormModalText;
  shipments: ShipmentRecord[];
  traders: Trader[];
  customers: Customer[];
  isLoadingOptions: boolean;
  selectedShipmentId: string;
  onShipmentIdChange: (v: string) => void;
  boxNumber: string;
  onBoxNumberChange: (v: string) => void;
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
  isSubmitting: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
};

const BOX_TYPES: BoxType[] = ['SMALL', 'MEDIUM', 'LARGE', 'CUSTOM'];
const OWNERSHIP_TYPES: BoxOwnership[] = ['UNASSIGNED', 'TRADER', 'CUSTOMER', 'SHARED', 'CUSTOM'];

export function NewBoxFormModal({
  isOpen,
  t,
  shipments,
  traders,
  customers,
  isLoadingOptions,
  selectedShipmentId,
  onShipmentIdChange,
  boxNumber,
  onBoxNumberChange,
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
  isSubmitting,
  error,
  onSave,
  onClose,
}: NewBoxFormModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog modal-dialog--form" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" type="button" aria-label={t.cancel} onClick={onClose}>
          <FaXmark />
        </button>

        <h3 className="modal-title">{t.title}</h3>
        <p className="modal-message">{t.description}</p>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>{t.shipmentNumberLabel}</label>
            <select
              className="seasons-manager__year-input"
              value={selectedShipmentId}
              onChange={(e) => onShipmentIdChange(e.target.value)}
              disabled={isLoadingOptions}
              autoFocus
            >
              <option value="">{t.shipmentNumberPlaceholder}</option>
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

          <div className={styles.field}>
            <label className={styles.label}>{t.ownershipTypeLabel}</label>
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
          </div>

          {ownershipType === 'TRADER' ? (
            <div className={styles.field}>
              <label className={styles.label}>{t.traderLabel}</label>
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
            </div>
          ) : null}

          {ownershipType === 'CUSTOMER' ? (
            <div className={styles.field}>
              <label className={styles.label}>{t.customerLabel}</label>
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
            </div>
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
