import { FaXmark } from 'react-icons/fa6';
import { SubmitButton } from '../../../components/ui/SubmitButton';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import type { BoxOwnership } from '../../../services/boxesApi';
import type { ShipmentRecord } from '../../../services/shipmentsApi';
import type { Trader } from '../../../services/tradersApi';
import type { Customer } from '../../../services/customersApi';
import type { NewBoxFormMode } from '../hooks/useNewBoxForm';
import styles from './styles/NewBoxFormModal.module.css';

type BoxType = 'SMALL' | 'MEDIUM' | 'LARGE' | 'CUSTOM';
type NewBoxStatus = 'OPEN' | 'CLOSED';

type NewBoxFormModalText = {
  title: string;
  description: string;
  singleModeLabel: string;
  bulkModeLabel: string;
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
  ownerNameLabel: string;
  ownerNamePlaceholder: string;
  statusLabel: string;
  notesLabel: string;
  notesPlaceholder: string;
  startNumberLabel: string;
  startNumberPlaceholder: string;
  endNumberLabel: string;
  endNumberPlaceholder: string;
  save: string;
  saving: string;
  cancel: string;
  boxTypeOptions: Record<BoxType, string>;
  ownershipTypeOptions: Record<BoxOwnership, string>;
  statusOptions: Record<NewBoxStatus, string>;
};

type NewBoxFormModalProps = {
  isOpen: boolean;
  t: NewBoxFormModalText;
  mode: NewBoxFormMode;
  onModeChange: (v: NewBoxFormMode) => void;
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
  externalOwnerName: string;
  onExternalOwnerNameChange: (v: string) => void;
  status: NewBoxStatus;
  onStatusChange: (v: NewBoxStatus) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  startNumber: string;
  onStartNumberChange: (v: string) => void;
  endNumber: string;
  onEndNumberChange: (v: string) => void;
  isSubmitting: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
};

const BOX_TYPES: BoxType[] = ['SMALL', 'MEDIUM', 'LARGE', 'CUSTOM'];
const OWNERSHIP_TYPES: BoxOwnership[] = ['GENERAL', 'TRADER', 'CUSTOMER', 'SHARED', 'EXTERNAL_TRADER'];
const NEW_BOX_STATUSES: NewBoxStatus[] = ['OPEN', 'CLOSED'];

export function NewBoxFormModal({
  isOpen,
  t,
  mode,
  onModeChange,
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
  externalOwnerName,
  onExternalOwnerNameChange,
  status,
  onStatusChange,
  notes,
  onNotesChange,
  startNumber,
  onStartNumberChange,
  endNumber,
  onEndNumberChange,
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

        <div className={styles.modeToggle}>
          <button
            type="button"
            className={`${styles.modeButton} ${mode === 'SINGLE' ? styles.modeButtonActive : ''}`}
            onClick={() => onModeChange('SINGLE')}
          >
            {t.singleModeLabel}
          </button>
          <button
            type="button"
            className={`${styles.modeButton} ${mode === 'BULK' ? styles.modeButtonActive : ''}`}
            onClick={() => onModeChange('BULK')}
          >
            {t.bulkModeLabel}
          </button>
        </div>

        <div className={styles.formGrid}>
          {mode === 'BULK' ? (
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>{t.shipmentNumberLabel}</label>
                <CustomSelect
                  className="seasons-manager__year-input"
                  value={selectedShipmentId}
                  onChange={(value) => onShipmentIdChange(value)}
                  disabled={isLoadingOptions}
                  placeholder={t.shipmentNumberPlaceholder}
                  options={shipments.map((s) => ({ value: String(s.id), label: String(s.shipmentNumber) }))}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>{t.startNumberLabel}</label>
                <input
                  className="seasons-manager__year-input"
                  type="number"
                  min={1}
                  step={1}
                  value={startNumber}
                  onChange={(e) => onStartNumberChange(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder={t.startNumberPlaceholder}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>{t.endNumberLabel}</label>
                <input
                  className="seasons-manager__year-input"
                  type="number"
                  min={1}
                  step={1}
                  value={endNumber}
                  onChange={(e) => onEndNumberChange(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder={t.endNumberPlaceholder}
                />
              </div>
            </div>
          ) : (
            <>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label className={styles.label}>{t.shipmentNumberLabel}</label>
                  <CustomSelect
                    className="seasons-manager__year-input"
                    value={selectedShipmentId}
                    onChange={(value) => onShipmentIdChange(value)}
                    disabled={isLoadingOptions}
                    placeholder={t.shipmentNumberPlaceholder}
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
              </div>

              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label className={styles.label}>{t.ownershipTypeLabel}</label>
                  <CustomSelect
                    className="seasons-manager__year-input"
                    value={ownershipType}
                    onChange={(value) => onOwnershipTypeChange(value)}
                    placeholder={t.ownershipTypePlaceholder}
                    options={OWNERSHIP_TYPES.map((type) => ({ value: type, label: t.ownershipTypeOptions[type] }))}
                  />
                </div>

                {ownershipType === 'EXTERNAL_TRADER' ? (
                  <>
                    <div className={styles.field}>
                      <label className={styles.label}>{t.ownerNameLabel}</label>
                      <input
                        className="seasons-manager__year-input"
                        type="text"
                        value={externalOwnerName}
                        onChange={(e) => onExternalOwnerNameChange(e.target.value)}
                        placeholder={t.ownerNamePlaceholder}
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>{t.statusLabel}</label>
                      <CustomSelect
                        className="seasons-manager__year-input"
                        value={status}
                        onChange={(value) => onStatusChange(value as NewBoxStatus)}
                        options={NEW_BOX_STATUSES.map((s) => ({ value: s, label: t.statusOptions[s] }))}
                      />
                    </div>
                  </>
                ) : null}

                {ownershipType === 'TRADER' ? (
                  <div className={styles.field}>
                    <label className={styles.label}>{t.traderLabel}</label>
                    <CustomSelect
                      className="seasons-manager__year-input"
                      value={traderId}
                      onChange={(value) => onTraderIdChange(value)}
                      disabled={isLoadingOptions}
                      placeholder={t.traderPlaceholder}
                      options={traders.map((trader) => ({ value: String(trader.id), label: trader.name }))}
                    />
                  </div>
                ) : null}

                {ownershipType === 'CUSTOMER' ? (
                  <div className={styles.field}>
                    <label className={styles.label}>{t.customerLabel}</label>
                    <CustomSelect
                      className="seasons-manager__year-input"
                      value={customerId}
                      onChange={(value) => onCustomerIdChange(value)}
                      disabled={isLoadingOptions}
                      placeholder={t.customerPlaceholder}
                      options={customers.map((customer) => ({ value: String(customer.id), label: customer.customerName }))}
                    />
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
            </>
          )}
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
