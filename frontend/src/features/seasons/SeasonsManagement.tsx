import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addSeason, activateSeason, fetchSeasons } from '../../store/seasonsSlice';
import type { AppDispatch, RootState } from '../../store';

const MIN_SEASON_YEAR = 2020;
const MAX_SEASON_YEAR = 2100;

const isSeasonYearInAllowedRange = (value: string): boolean => {
  const parsedYear = Number(value);

  return (
    Number.isInteger(parsedYear) &&
    parsedYear >= MIN_SEASON_YEAR &&
    parsedYear <= MAX_SEASON_YEAR
  );
};

const SeasonsManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: seasons, loading, error, activeSeasonId } = useSelector((state: RootState) => state.seasons);
  const [newSeasonYear, setNewSeasonYear] = useState('');

  useEffect(() => {
    dispatch(fetchSeasons());
  }, [dispatch]);

  const handleAdd = () => {
    const parsedYear = Number(newSeasonYear);
    if (isSeasonYearInAllowedRange(newSeasonYear)) {
      void dispatch(addSeason({ yearName: parsedYear }));
      setNewSeasonYear('');
    }
  };

  const handleActivate = (id: number) => {
    void dispatch(activateSeason(id));
  };

  const isNewYearValid = isSeasonYearInAllowedRange(newSeasonYear);

  return (
    <div className="seasons-manager">
      <div className="seasons-manager__header">
        <h3 className="settings-card__title">ניהול עונות</h3>
        <p className="settings-card__hint">הוספה והגדרה של עונה פעילה במערכת.</p>
      </div>

      <div className="seasons-manager__create-row">
        <input
          className="seasons-manager__year-input"
          type="number"
          min={MIN_SEASON_YEAR}
          max={MAX_SEASON_YEAR}
          step={1}
          value={newSeasonYear}
          onChange={(e) => setNewSeasonYear(e.target.value)}
          placeholder={`שנת עונה חדשה (${MIN_SEASON_YEAR}-${MAX_SEASON_YEAR})`}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleAdd}
          disabled={!isNewYearValid || loading}
        >
          הוסף עונה
        </button>
      </div>

      {loading ? <p className="seasons-manager__state">טוען עונות...</p> : null}
      {error ? <p className="seasons-manager__error">{error}</p> : null}

      <div className="seasons-manager__all-header">
        <h4 className="seasons-manager__all-title">כלל העונות הקיימות</h4>
        <span className="seasons-manager__all-count">{seasons.length}</span>
      </div>

      {seasons.length === 0 && !loading ? (
        <div className="seasons-manager__empty">אין עונות להצגה כרגע.</div>
      ) : null}

      {seasons.length > 0 ? (
        <ul className="seasons-manager__list">
          {seasons.map((season) => {
            const isActive = season.id === activeSeasonId || season.isActive;

            return (
              <li key={season.id} className="seasons-manager__item">
                <div className="seasons-manager__item-main">
                  <span className="seasons-manager__year">{season.yearName}</span>
                  <span className={`seasons-manager__badge${isActive ? ' is-active' : ''}`}>
                    {isActive ? 'פעילה' : 'לא פעילה'}
                  </span>
                </div>

                {!isActive ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleActivate(season.id)}
                    disabled={loading}
                  >
                    הגדר כפעילה
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};

export default SeasonsManagement;
