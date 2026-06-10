import { useCallback, useEffect, useState } from 'react';
import { useSeasonCardWidth } from '../../seasons/hooks/useSeasonCardWidth';
import { getSeasons, type Season } from '../../../services/seasonsApi';
import { getSystemConfig, updatePricing, type Currency, type SystemConfig } from '../../../services/systemConfigApi';
import { getPricingI18n } from '../i18n.pricing';
import type { Lang } from '../../settings/settingsPage.types';

export type SeasonPricing = {
  season: Season;
  config: SystemConfig;
};

export type PricingHeaderState = {
  isEditDisabled: boolean;
  onEdit: () => void;
};

type Props = {
  lang: Lang;
  onHeaderStateChange?: (state: PricingHeaderState | null) => void;
};

export function usePricingManagement({ lang, onHeaderStateChange }: Props) {
  const t = getPricingI18n(lang);

  const [seasonPricings, setSeasonPricings] = useState<SeasonPricing[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);

  const [currency, setCurrency] = useState<Currency | ''>('');
  const [unitPrice, setUnitPrice] = useState('');

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
      setSeasonPricings(seasons.map((s, i) => ({ season: s, config: configs[i] })));
    } catch {
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const handleSelectSeason = (seasonId: number) => {
    setSelectedSeasonId((prev) => (prev === seasonId ? null : seasonId));
    setSuccessMessage(null);
  };

  const handleOpenEditModal = () => {
    if (selectedSeasonId === null) return;
    const sp = seasonPricings.find((x) => x.season.id === selectedSeasonId);
    if (!sp) return;
    setCurrency(sp.config.currency ?? '');
    setUnitPrice(sp.config.unitPrice ?? '');
    setSaveError(null);
    setSuccessMessage(null);
    setIsEditModalOpen(true);
  };

  const isEditDisabled = selectedSeasonId === null || loading;

  useEffect(() => {
    if (!onHeaderStateChange) return;
    onHeaderStateChange({ isEditDisabled, onEdit: handleOpenEditModal });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditDisabled, selectedSeasonId]);

  useEffect(() => () => { onHeaderStateChange?.(null); }, [onHeaderStateChange]);

  const validationError =
    !currency ? t.currencyRequired
    : !unitPrice || isNaN(Number(unitPrice)) || Number(unitPrice) <= 0 ? t.invalidPrice
    : null;

  const handleSave = async () => {
    if (!selectedSeasonId || validationError || !currency) return;
    setSaving(true);
    setSaveError(null);
    setSuccessMessage(null);
    try {
      const updated = await updatePricing({
        seasonId: selectedSeasonId,
        currency: currency as Currency,
        unitPrice: Number(unitPrice),
      });
      setSeasonPricings((prev) =>
        prev.map((sp) => sp.season.id === selectedSeasonId ? { ...sp, config: updated } : sp),
      );
      setSuccessMessage(t.saved);
      setIsEditModalOpen(false);
    } catch {
      setSaveError(t.saveError);
    } finally {
      setSaving(false);
    }
  };

  const inactiveCount = seasonPricings.filter((sp) => !sp.season.isActive).length;
  const secondaryCardWidth = useSeasonCardWidth(inactiveCount, seasonPricings.length);

  return {
    t,
    loading,
    saving,
    error,
    saveError,
    successMessage,
    validationError,
    seasonPricings,
    selectedSeasonId,
    secondaryCardWidth,
    currency, setCurrency,
    unitPrice, setUnitPrice,
    isEditModalOpen,
    setIsEditModalOpen,
    handleSelectSeason,
    handleSave,
  };
}
