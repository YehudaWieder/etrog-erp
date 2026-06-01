import React from 'react';
import ManagementCardsGrid from '../../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../../components/ui/ManagementSelectableCard';
import type { SeasonsI18n } from '../i18n';
import type { ResolvedSeason } from '../seasonsManagement.types';
import styles from './styles/SeasonsCardsSection.module.css';

type SeasonsCardsSectionProps = {
  title: string;
  seasons: ResolvedSeason[];
  selectedSeasonId: number | null;
  onToggleSeason: (seasonId: number) => void;
  t: SeasonsI18n;
  gridClassName: string;
  style?: React.CSSProperties;
  statusLabel: string;
  activeStatus?: boolean;
};

export function SeasonsCardsSection({
  title,
  seasons,
  selectedSeasonId,
  onToggleSeason,
  t,
  gridClassName,
  style,
  statusLabel,
  activeStatus = false,
}: SeasonsCardsSectionProps) {
  if (!seasons.length) {
    return null;
  }

  return (
    <>
      <h4 className="seasons-manager__section-title">{title}</h4>
      <ManagementCardsGrid className={gridClassName} style={style}>
        {seasons.map((season) => {
          const isSelected = selectedSeasonId === season.id;

          return (
            <li key={season.id}>
              <ManagementSelectableCard
                isSelected={isSelected}
                badgeLabel={String(season.yearName).slice(-2)}
                onToggle={() => onToggleSeason(season.id)}
                topContent={
                  <>
                    <span className="seasons-manager__year">{season.yearName}</span>
                    <span className="seasons-manager__meta">{t.seasonId}: {season.id}</span>
                  </>
                }
                topAside={
                  <span className={`${styles.cardStatus}${activeStatus ? ` ${styles.cardStatusActive}` : ''}`}>
                    {statusLabel}
                  </span>
                }
              />
            </li>
          );
        })}
      </ManagementCardsGrid>
    </>
  );
}
