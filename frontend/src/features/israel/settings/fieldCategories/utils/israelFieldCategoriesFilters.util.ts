import type { GlobalScopedFilterConfig } from '../../../../../components/ui/GlobalScopedFilters';
import type { IsraelFieldCategoriesI18n } from '../i18n';

type FieldFilterItem = {
  id: number;
  name: string;
};

export function parseFieldFilterId(value: string): number | 'all' {
  if (value === 'all') {
    return 'all';
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 'all';
}

export function buildIsraelFieldCategoriesFiltersConfig(params: {
  fields: FieldFilterItem[];
  t: IsraelFieldCategoriesI18n;
}): GlobalScopedFilterConfig[] {
  const { fields, t } = params;

  return [
    {
      key: 'fieldId',
      label: t.fieldFilterLabel,
      defaultValue: 'all',
      queryParam: 'ifcField',
      options: [
        { value: 'all', label: t.allFieldsOption },
        ...fields.map((field) => ({
          value: String(field.id),
          label: field.name,
        })),
      ],
    },
  ];
}
