import { useCallback, useEffect, useState } from 'react';
import { useSeasonCardWidth } from '../../seasons/hooks/useSeasonCardWidth';
import { getSeasons, type Season } from '../../../services/seasonsApi';
import { getSystemConfig, updateBoxCapacities, type SystemConfig } from '../../../services/systemConfigApi';
import { getSystemConfigI18n } from '../i18n';
import type { Lang } from '../../settings/settingsPage.types';

export type SeasonConfig = {
  season: Season;
  config: SystemConfig;
};

export type CartonsHeaderState = {
  isEditDisabled: boolean;
  onEdit: () => void;
};

type Props = {
  lang: Lang;
  onHeaderStateChange?: (state: CartonsHeaderState | null) => void;
};

export function useSystemConfigManagement({ lang, onHeaderStateChange }: Props) {
  const t = getSystemConfigI18n(lang);

  const [seasonConfigs, setSeasonConfigs] = useState<SeasonConfig[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);

  const [small, setSmall] = useState('');
  const [medium, setMedium] = useState('');
  const [large, setLarge] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const seasons = await getSeasons();
      const configs = await Promise.all(seasons.map((s) => getSystemConfig(s.id)));
      const combined: SeasonConfig[] = seasons.map((s, i) => ({ season: s, config: configs[i] }));
      setSeasonConfigs(combined);

      // No default selection — user must click a card to select
    } catch {
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const fillFormFromSeason = (seasonId: number, configs: SeasonConfig[]) => {
    const sc = configs.find((x) => x.season.id === seasonId);
    if (!sc) return;
    setSmall(String(sc.config.smallBoxCapacity));
    setMedium(String(sc.config.mediumBoxCapacity));
    setLarge(String(sc.config.largeBoxCapacity));
  };

  const handleSelectSeason = (seasonId: number) => {
    setSelectedSeasonId((prev) => (prev === seasonId ? null : seasonId));
    setSuccessMessage(null);
  };

  const handleOpenEditModal = () => {
    if (selectedSeasonId === null) return;
    fillFormFromSeason(selectedSeasonId, seasonConfigs);
    setSaveError(null);
    setSuccessMessage(null);
    setIsEditModalOpen(true);
  };

  const isPositiveInt = (v: string) => /^\d+$/.test(v.trim()) && Number(v) > 0;
  const validationError =
    !isPositiveInt(small) || !isPositiveInt(medium) || !isPositiveInt(large)
      ? t.invalidValue
      : null;

  const isEditDisabled = selectedSeasonId === null || loading;

  useEffect(() => {
    if (!onHeaderStateChange) return;
    onHeaderStateChange({ isEditDisabled, onEdit: handleOpenEditModal });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditDisabled, selectedSeasonId]);

  useEffect(() => () => { onHeaderStateChange?.(null); }, [onHeaderStateChange]);

  const handleSave = async () => {
    if (!selectedSeasonId || validationError) return;
    setSaving(true);
    setSaveError(null);
    setSuccessMessage(null);
    try {
      const updated = await updateBoxCapacities({
        seasonId: selectedSeasonId,
        smallBoxCapacity: Number(small),
        mediumBoxCapacity: Number(medium),
        largeBoxCapacity: Number(large),
      });
      setSeasonConfigs((prev) =>
        prev.map((sc) => sc.season.id === selectedSeasonId ? { ...sc, config: updated } : sc),
      );
      setSuccessMessage(t.saved);
      setIsEditModalOpen(false);
    } catch {
      setSaveError(t.saveError);
    } finally {
      setSaving(false);
    }
  };

  const selectedConfig = seasonConfigs.find((sc) => sc.season.id === selectedSeasonId) ?? null;

  const inactiveCount = seasonConfigs.filter((sc) => !sc.season.isActive).length;
  const secondaryCardWidth = useSeasonCardWidth(inactiveCount, seasonConfigs.length);

  return {
    t,
    loading,
    saving,
    error,
    saveError,
    successMessage,
    validationError,
    seasonConfigs,
    selectedSeasonId,
    selectedConfig,
    secondaryCardWidth,
    small, setSmall,
    medium, setMedium,
    large, setLarge,
    isEditModalOpen,
    setIsEditModalOpen,
    handleSelectSeason,
    handleSave,
  };
}
