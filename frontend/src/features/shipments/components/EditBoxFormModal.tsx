import { FaXmark } from 'react-icons/fa6';
import { SubmitButton } from '../../../components/ui/SubmitButton';
import { TopLoadingBar } from '../../../components/ui/TopLoadingBar';
import { CustomSelect } from '../../../components/ui/CustomSelect';
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
type BoxOwnership = 'GENERAL' | 'TRADER' | 'CUSTOMER' | 'SHARED' | 'CUSTOM' | 'EXTERNAL_TRADER';

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
  shipmentFrozenHint: string;
  traderLabel: string;
  traderPlaceholder: string;
  customerLabel: string;
  customerPlaceholder: string;
  ownerNameLabel: string;
  ownerNamePlaceholder: string;
  notesLabel: string;
  notesPlaceholder: string;
  save: string;
  saving: string;
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
  externalOwnerName: string;
  onExternalOwnerNameChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  isShipped: boolean;
  isShipmentFrozen: boolean;
  isShipmentShipped: boolean;
  isChangingShipment: boolean;
  isSubmitting: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
};

const BOX_STATUSES: BoxStatus[] = ['OPEN', 'CLOSED', 'SHIPPED', 'DELIVERED'];
const BOX_STATUSES_SHIPPED_ONLY: BoxStatus[] = ['SHIPPED', 'DELIVERED'];
const BOX_TYPES: BoxType[] = ['SMALL', 'MEDIUM', 'LARGE', 'CUSTOM'];
const OWNERSHIP_TYPES: BoxOwnership[] = ['GENERAL', 'TRADER', 'CUSTOMER', 'SHARED', 'EXTERNAL_TRADER'];

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
  externalOwnerName,
  onExternalOwnerNameChange,
  notes,
  onNotesChange,
  isShipped,
  isShipmentFrozen,
  isShipmentShipped,
  isChangingShipment,
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

        <h3 className="modal-title" style={{ position: 'relative' }}>
          {t.title(originalBoxNumber)}
          <TopLoadingBar isLoading={isLoadingOptions} />
        </h3>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>{t.shipmentLabel}</label>
            <CustomSelect
              className="seasons-manager__year-input"
              value={selectedShipmentId}
              onChange={(value) => onShipmentIdChange(value)}
              disabled={isLoadingOptions}
              placeholder={t.shipmentPlaceholder}
              options={shipments.map((s) => ({ value: String(s.id), label: String(s.shipmentNumber) }))}
            />
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

          {isShipmentFrozen ? (
            <p className="seasons-manager__hint" style={{ gridColumn: '1 / -1', margin: 0 }}>
              {t.shipmentFrozenHint}
            </p>
          ) : null}

          {!isChangingShipment ? (
            <div className={styles.field}>
              <label className={styles.label}>{t.statusLabel}</label>
              <CustomSelect
                className="seasons-manager__year-input"
                value={status}
                onChange={(value) => onStatusChange(value as BoxStatus)}
                options={(status === 'SHIPPED' || status === 'DELIVERED' ? BOX_STATUSES_SHIPPED_ONLY : ['OPEN', 'CLOSED'] as BoxStatus[]).map((s) => ({ value: s, label: t.statusOptions[s] }))}
              />
            </div>
          ) : null}

          {!isShipped ? (
            <>
              {ownershipType !== 'EXTERNAL_TRADER' ? (
                <div className={styles.field}>
                  <label className={styles.label}>{t.boxTypeLabel}</label>
                  <CustomSelect
                    className="seasons-manager__year-input"
                    value={boxType}
                    onChange={(value) => onBoxTypeChange(value)}
                    placeholder={t.boxTypePlaceholder}
                    options={BOX_TYPES.map((type) => ({ value: type, label: t.boxTypeOptions[type] }))}
                  />
                </div>
              ) : null}

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
                  <CustomSelect
                    className="seasons-manager__year-input"
                    value={ownershipType}
                    onChange={(value) => onOwnershipTypeChange(value)}
                    placeholder={t.ownershipTypePlaceholder}
                    options={OWNERSHIP_TYPES.map((type) => ({ value: type, label: t.ownershipTypeOptions[type] }))}
                  />
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
                    <CustomSelect
                      className="seasons-manager__year-input"
                      value={traderId}
                      onChange={(value) => onTraderIdChange(value)}
                      disabled={isLoadingOptions}
                      placeholder={t.traderPlaceholder}
                      options={traders.map((trader) => ({ value: String(trader.id), label: trader.name }))}
                    />
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
                    <CustomSelect
                      className="seasons-manager__year-input"
                      value={customerId}
                      onChange={(value) => onCustomerIdChange(value)}
                      disabled={isLoadingOptions}
                      placeholder={t.customerPlaceholder}
                      options={customers.map((customer) => ({ value: String(customer.id), label: customer.customerName }))}
                    />
                  )}
                </div>
              ) : null}

              {ownershipType === 'EXTERNAL_TRADER' ? (
                <div className={styles.field}>
                  <label className={styles.label}>{t.ownerNameLabel}</label>
                  {hasItems ? (
                    <div style={infoStyle}>{externalOwnerName || '—'}</div>
                  ) : (
                    <input
                      className="seasons-manager__year-input"
                      type="text"
                      value={externalOwnerName}
                      onChange={(e) => onExternalOwnerNameChange(e.target.value)}
                      placeholder={t.ownerNamePlaceholder}
                    />
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
          <SubmitButton
            className="btn btn-success"
            onClick={onSave}
            disabled={isLoadingOptions}
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
