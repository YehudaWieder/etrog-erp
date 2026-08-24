import { useCallback, useMemo } from 'react';
import { FaFileArrowDown, FaPrint } from 'react-icons/fa6';
import {
  GlobalScopedFilters,
  type GlobalScopedFilterConfig,
} from '../../../../../components/ui/GlobalScopedFilters';
import type { IsraelFieldCategorySummaryField } from '../../../../../services/israel/israelClassificationsApi';
import type { IsraelHarvestI18n } from '../../i18n';
import {
  printIsraelHarvestFieldCategorySummary,
  exportIsraelHarvestFieldCategorySummaryToExcel,
} from '../../services/israelHarvestFieldCategorySummaryPrint.service';
import matrixStyles from '../../../../harvest/components/shared/CategoryGradeMatrixTable.module.css';
import sharedFilterStyles from '../../../../../components/ui/styles/GlobalFiltersBar.module.css';
import workspaceStyles from '../../../../../components/ui/styles/WorkspaceSection.module.css';
import styles from './IsraelHarvestFieldCategorySummarySection.module.css';

type IsraelHarvestFieldCategorySummarySectionProps = {
  lang: 'he' | 'en';
  labels: IsraelHarvestI18n['fieldCategorySummary'];
  filters: GlobalScopedFilterConfig[];
  fields: IsraelFieldCategorySummaryField[];
  isLoading: boolean;
  loadError: string;
  seasonLabel?: string | null;
  onFiltersChange: (values: Record<string, string>) => void;
};

export function IsraelHarvestFieldCategorySummarySection({
  lang,
  labels,
  filters,
  fields,
  isLoading,
  loadError,
  seasonLabel = null,
  onFiltersChange,
}: IsraelHarvestFieldCategorySummarySectionProps) {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale),
    [locale],
  );

  const hasData = fields.length > 0;

  const breakdownLines = useCallback(
    (
      splits: IsraelFieldCategorySummaryField['categories'][number]['gradeGroupSplits'],
    ) =>
      splits.map((split) => ({
        name: split.groupName ?? labels.ungroupedLabel,
        percent: `${split.percent.toLocaleString(locale, {
          maximumFractionDigits: 1,
        })}%`,
      })),
    [labels.ungroupedLabel, locale],
  );

  const handlePrint = useCallback(() => {
    printIsraelHarvestFieldCategorySummary({
      lang,
      labels,
      fields,
      seasonLabel,
    });
  }, [lang, labels, fields, seasonLabel]);

  const handleExport = useCallback(async () => {
    try {
      await exportIsraelHarvestFieldCategorySummaryToExcel({
        lang,
        labels,
        fields,
        seasonLabel,
      });
    } catch {
      window.alert(labels.exportError);
    }
  }, [lang, labels, fields, seasonLabel]);

  return (
    <section className={styles.section}>
      <header className={workspaceStyles.header}>
        <div>
          <p className={workspaceStyles.description}>{labels.description}</p>
        </div>
      </header>

      <GlobalScopedFilters
        scope="israel-harvest-field-category-summary"
        filters={filters}
        direction={lang === 'he' ? 'rtl' : 'ltr'}
        onValuesChange={onFiltersChange}
        actions={
          hasData ? (
            <div
              className={`global-filters-bar__icon-actions ${sharedFilterStyles.iconActions}`}
              aria-label={labels.actionsLabel}
            >
              <button
                type="button"
                className={`global-filters-bar__icon-btn ${sharedFilterStyles.iconBtn}`}
                onClick={handlePrint}
                aria-label={labels.printAriaLabel}
                title={labels.printTitle}
              >
                <FaPrint />
              </button>
              <button
                type="button"
                className={`global-filters-bar__icon-btn ${sharedFilterStyles.iconBtn}`}
                onClick={() => {
                  void handleExport();
                }}
                aria-label={labels.exportAriaLabel}
                title={labels.exportTitle}
              >
                <FaFileArrowDown />
              </button>
            </div>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className={styles.loadingText}>{labels.loading}</div>
      ) : null}

      {!isLoading && !hasData && !loadError ? (
        <div className={styles.statusBox}>{labels.empty}</div>
      ) : null}

      {!isLoading && hasData
        ? fields.map((field) => (
            <section key={field.fieldId} className={styles.fieldSection}>
              <h3 className={styles.fieldTitle}>{field.fieldName}</h3>

              <div className={matrixStyles.tableViewport}>
                <table className={matrixStyles.table}>
                  <thead>
                    <tr>
                      <th className={matrixStyles.categoryHead}>
                        {labels.columns.fieldCategory}
                      </th>
                      <th>{labels.columns.quantity}</th>
                      <th className={styles.breakdownHead}>
                        {labels.columns.breakdown}
                      </th>
                      <th>{labels.columns.price}</th>
                      <th className={matrixStyles.totalHead}>
                        {labels.columns.total}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {field.categories.map((category) => (
                      <tr key={category.fieldCategoryId}>
                        <th className={matrixStyles.categoryCell}>
                          {category.fieldCategoryName}
                        </th>
                        <td>{numberFormatter.format(category.quantity)}</td>
                        <td className={styles.breakdownCell}>
                          {breakdownLines(category.gradeGroupSplits).map(
                            (line) => (
                              <div key={line.name} className={styles.breakdownLine}>
                                <span>{line.name}</span>
                                <span>{line.percent}</span>
                              </div>
                            ),
                          )}
                        </td>
                        <td>
                          {numberFormatter.format(category.price)}{' '}
                          {category.currency}
                        </td>
                        <td className={matrixStyles.totalCell}>
                          {numberFormatter.format(category.total)}{' '}
                          {category.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        : null}

      {loadError ? (
        <div className={`${styles.statusBox} ${styles.statusError}`}>
          <div>{loadError}</div>
        </div>
      ) : null}
    </section>
  );
}
