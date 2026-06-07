import { useCallback, useEffect, useMemo } from 'react';
import { useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import { setScopeFilter, setScopeFilters } from '../store/globalFiltersSlice';

const EMPTY_SCOPE_FILTERS: Record<string, string> = {};

export type GlobalFilterDefinition = {
  key: string;
  defaultValue: string;
  queryParam?: string;
};

type UseGlobalFiltersResult = {
  values: Record<string, string>;
  setFilterValue: (key: string, value: string) => void;
};

function areFilterMapsEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const aEntries = Object.entries(a);
  const bEntries = Object.entries(b);

  if (aEntries.length !== bEntries.length) {
    return false;
  }

  return aEntries.every(([key, value]) => b[key] === value);
}

export function useGlobalFilters(scope: string, definitions: GlobalFilterDefinition[]): UseGlobalFiltersResult {
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams, setSearchParams] = useSearchParams();
  const resetVersion = useSelector((state: RootState) => state.globalFilters.resetVersion);
  const lastHandledResetVersionRef = useRef<number>(resetVersion);
  const scopeFilters = useSelector(
    (state: RootState) => state.globalFilters.scopes[scope] ?? EMPTY_SCOPE_FILTERS,
  );

  const resolvedValues = useMemo(() => {
    const next: Record<string, string> = {};

    for (const definition of definitions) {
      next[definition.key] = scopeFilters[definition.key] ?? definition.defaultValue;
    }

    return next;
  }, [definitions, scopeFilters]);

  useEffect(() => {
    const hasGlobalReset = resetVersion !== lastHandledResetVersionRef.current;
    const mergedValues: Record<string, string> = {};

    for (const definition of definitions) {
      const queryKey = definition.queryParam ?? definition.key;
      const queryValue = searchParams.get(queryKey);
      const scopeValue = scopeFilters[definition.key];

      if (hasGlobalReset) {
        mergedValues[definition.key] = definition.defaultValue;
        continue;
      }

      if (scopeValue !== undefined) {
        mergedValues[definition.key] = scopeValue;
        continue;
      }

      if (queryValue !== null) {
        mergedValues[definition.key] = queryValue;
        continue;
      }

      mergedValues[definition.key] = scopeFilters[definition.key] ?? definition.defaultValue;
    }

    if (!areFilterMapsEqual(mergedValues, resolvedValues)) {
      dispatch(setScopeFilters({ scope, filters: mergedValues }));
    }

    lastHandledResetVersionRef.current = resetVersion;
  }, [definitions, dispatch, resetVersion, resolvedValues, scope, scopeFilters, searchParams]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    let hasChanged = false;

    for (const definition of definitions) {
      const queryKey = definition.queryParam ?? definition.key;
      const value = resolvedValues[definition.key] ?? definition.defaultValue;
      const existing = nextParams.get(queryKey);

      if (value === definition.defaultValue) {
        if (existing !== null) {
          nextParams.delete(queryKey);
          hasChanged = true;
        }
        continue;
      }

      if (existing !== value) {
        nextParams.set(queryKey, value);
        hasChanged = true;
      }
    }

    if (hasChanged && nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [definitions, resolvedValues, searchParams, setSearchParams]);

  const setFilterValue = useCallback(
    (key: string, value: string) => {
      dispatch(setScopeFilter({ scope, key, value }));
    },
    [dispatch, scope],
  );

  return {
    values: resolvedValues,
    setFilterValue,
  };
}
