import React, { useEffect, useMemo } from 'react';
import { useGlobalFilters, type GlobalFilterDefinition } from '../../hooks/useGlobalFilters';
import { GlobalFiltersBar, type GlobalFilterOption } from './GlobalFiltersBar';

export type GlobalScopedFilterConfig = {
  key: string;
  label: string;
  defaultValue: string;
  options: GlobalFilterOption[];
  queryParam?: string;
  type?: 'calendar';
  lang?: 'he' | 'en';
};

export type GlobalScopedFiltersApi = {
  setFilterValue: (key: string, value: string) => void;
};

type GlobalScopedFiltersProps = {
  scope: string;
  filters: GlobalScopedFilterConfig[];
  className?: string;
  direction?: 'rtl' | 'ltr';
  actions?: React.ReactNode;
  onValuesChange?: (values: Record<string, string>) => void;
  onApiReady?: (api: GlobalScopedFiltersApi) => void;
};

export const GlobalScopedFilters: React.FC<GlobalScopedFiltersProps> = ({
  scope,
  filters,
  className,
  direction = 'rtl',
  actions,
  onValuesChange,
  onApiReady,
}) => {
  const definitions = useMemo<GlobalFilterDefinition[]>(
    () =>
      filters.map((filter) => ({
        key: filter.key,
        defaultValue: filter.defaultValue,
        queryParam: filter.queryParam,
      })),
    [filters],
  );

  const { values, setFilterValue } = useGlobalFilters(scope, definitions);

  useEffect(() => {
    onValuesChange?.(values);
  }, [onValuesChange, values]);

  useEffect(() => {
    onApiReady?.({ setFilterValue });
  }, [onApiReady, setFilterValue]);

  const controls = useMemo(
    () =>
      filters.map((filter) => ({
        id: `${scope}-${filter.key}`,
        label: filter.label,
        value: values[filter.key] ?? filter.defaultValue,
        options: filter.options,
        onChange: (value: string) => {
          setFilterValue(filter.key, value);
        },
        type: filter.type,
        lang: filter.lang,
      })),
    [filters, scope, setFilterValue, values],
  );

  return <GlobalFiltersBar controls={controls} className={className} direction={direction} actions={actions} />;
};
