import { useCallback, useEffect, useState } from 'react';
import { getIsraelSettings, updateIsraelSettings } from '../../../../../services/israel/israelSettingsApi';
import { getIsraelCartonCapacityI18n } from '../i18n';

export type IsraelCartonCapacityHeaderState = {
  isEditDisabled: boolean;
  onEdit: () => void;
};

type Props = {
  lang: 'he' | 'en';
  onHeaderStateChange?: (state: IsraelCartonCapacityHeaderState | null) => void;
};

export function useIsraelCartonCapacitySettings({ lang, onHeaderStateChange }: Props) {
  const t = getIsraelCartonCapacityI18n(lang);

  const [cartonCapacity, setCartonCapacity] = useState(50);
  const [isSelected, setIsSelected] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const settings = await getIsraelSettings();
      setCartonCapacity(settings.cartonCapacity);
    } catch {
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleOpenEditModal = () => {
    setEditValue(String(cartonCapacity));
    setSaveError(null);
    setSuccessMessage(null);
    setIsEditModalOpen(true);
  };

  const isEditDisabled = !isSelected || loading;

  useEffect(() => {
    if (!onHeaderStateChange) return;
    onHeaderStateChange({ isEditDisabled, onEdit: handleOpenEditModal });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditDisabled, cartonCapacity]);

  useEffect(() => () => { onHeaderStateChange?.(null); }, [onHeaderStateChange]);

  const isValid = /^\d+$/.test(editValue.trim());
  const validationError = !isValid ? t.invalidValue : null;

  const handleSave = async () => {
    if (validationError) return;
    setSaving(true);
    setSaveError(null);
    setSuccessMessage(null);
    try {
      const updated = await updateIsraelSettings({ cartonCapacity: Number(editValue) });
      setCartonCapacity(updated.cartonCapacity);
      setSuccessMessage(t.saved);
      setIsEditModalOpen(false);
    } catch {
      setSaveError(t.saveError);
    } finally {
      setSaving(false);
    }
  };

  return {
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
  };
}
