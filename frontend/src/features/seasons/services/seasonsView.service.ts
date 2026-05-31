import type { Season } from '../../../services/seasonsApi';
import type { ResolvedSeason } from '../seasonsManagement.types';

export function getSortedSeasons(seasons: Season[], activeSeasonId: number | null): ResolvedSeason[] {
  const seasonsWithResolvedActiveFlag = seasons.map((season) => ({
    ...season,
    isActive: season.id === activeSeasonId || season.isActive,
  }));

  return [...seasonsWithResolvedActiveFlag].sort((a, b) => {
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }

    return b.yearName - a.yearName;
  });
}

export function splitSeasonGroups(sortedSeasons: ResolvedSeason[]) {
  return {
    activeSeasons: sortedSeasons.filter((season) => season.isActive),
    nonActiveSeasons: sortedSeasons.filter((season) => !season.isActive),
  };
}
