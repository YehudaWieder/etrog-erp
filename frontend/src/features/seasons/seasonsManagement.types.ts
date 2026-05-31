import type { Season } from '../../services/seasonsApi';

export type SeasonsHeaderState = {
  count: number;
  isActivateDisabled: boolean;
  isDeleteDisabled: boolean;
  onActivate: () => void;
  onDelete: () => void;
};

export type SeasonsManagementProps = {
  onHeaderStateChange?: (state: SeasonsHeaderState | null) => void;
};

export type ResolvedSeason = Season & {
  isActive: boolean;
};
