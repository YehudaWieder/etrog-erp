import React from 'react';
import { FaXmark } from 'react-icons/fa6';
import ManagementCardsGrid from '../../../../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../../../../components/ui/ManagementSelectableCard';
import SettingsInnerTemplate from '../../../../../components/ui/SettingsInnerTemplate';
import { SubmitButton } from '../../../../../components/ui/SubmitButton';
import feedbackStyles from '../../../../settings/styles/SettingsWorkspaceFeedback.module.css';
import {
  useIsraelCartonCapacitySettings,
  type IsraelCartonCapacityHeaderState,
} from '../hooks/useIsraelCartonCapacitySettings';

export type { IsraelCartonCapacityHeaderState };

type Props = {
  lang: 'he' | 'en';
  onHeaderStateChange?: (state: IsraelCartonCapacityHeaderState | null) => void;
};

const IsraelCartonCapacitySettings: React.FC<Props> = ({ lang, onHeaderStateChange }) => {
  const {
    t,
    loading,
    saving,
    error,
    saveError,
    successMessage,
    validationError,
    cartonCapacity,
    isSelected,
    setIsSelected,
    editValue,
    setEditValue,
    isEditModalOpen,
    setIsEditModalOpen,
    handleSave,
  } = useIsraelCartonCapacitySettings({ lang, onHeaderStateChange });

  return (
    <SettingsInnerTemplate loadingMessage={loading ? t.loading : null} errorMessage={error}>
      {successMessage ? <p className={feedbackStyles.saved}>{successMessage}</p> : null}

      {!loading ? (
        <ManagementCardsGrid>
          <li>
            <ManagementSelectableCard
              isSelected={isSelected}
              badgeLabel="📦"
              onToggle={() => setIsSelected((previous) => !previous)}
              topContent={<span className="seasons-manager__year">{t.cardTitle}</span>}
              bottomContent={
                <span className="seasons-manager__meta">
                  <span style={{ direction: 'ltr', unicodeBidi: 'bidi-override' }}>{cartonCapacity}</span>{' '}
                  {t.unitsLabel}
                </span>
              }
            />
          </li>
        </ManagementCardsGrid>
      ) : null}

      {isEditModalOpen ? (
        <div className="modal-overlay">
          <div className="modal-dialog modal-dialog--form">
            <button
              className="modal-close"
              type="button"
              aria-label={t.cancel}
              onClick={() => setIsEditModalOpen(false)}
            >
              <FaXmark />
            </button>
            <h3 className="modal-title">{t.editTitle}</h3>

            <div className="management-form-grid">
              <div>
                <label htmlFor="israel-carton-capacity">{t.cartonCapacityLabel}</label>
                <input
                  id="israel-carton-capacity"
                  className="seasons-manager__year-input"
                  type="number"
                  min={0}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={t.cartonCapacityPlaceholder}
                  autoFocus
                />
              </div>
            </div>

            {validationError ? <p className="seasons-manager__error">{validationError}</p> : null}
            {saveError ? <p className="seasons-manager__error">{saveError}</p> : null}

            <div className="modal-actions">
              <button
                className="btn btn-danger"
                type="button"
                onClick={() => setIsEditModalOpen(false)}
              >
                {t.cancel}
              </button>
              <SubmitButton
                className="btn btn-success"
                type="button"
                onClick={() => { void handleSave(); }}
                disabled={!!validationError}
                isLoading={saving}
                loadingText={t.saving}
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

export default IsraelCartonCapacitySettings;
