import { useState, useEffect } from 'react';
import { getSeasons, type Season } from '../../../../services/seasonsApi';

type UseDashboardSeasonsResult = {
  seasons: Season[];
  activeSeasonId: string;
};

export function useDashboardSeasons(): UseDashboardSeasonsResult {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<string>('');

  useEffect(() => {
    getSeasons()
      .then((data) => {
        setSeasons(data);
        const active = data.find((s) => s.isActive);
        if (active) setActiveSeasonId(String(active.id));
      })
      .catch(() => {});
  }, []);

  return { seasons, activeSeasonId };
}
