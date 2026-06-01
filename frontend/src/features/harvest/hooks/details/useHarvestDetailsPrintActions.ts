import type { RefObject } from 'react';
import {
  HARVEST_DETAILS_PRINT_EXTRA_STYLES,
  HARVEST_FIELD_REPORT_DETAILS_PRINT_EXTRA_STYLES,
  HARVEST_SORTING_DAILY_DETAILS_PRINT_EXTRA_STYLES,
} from '../../services/harvestPrintStyles';
import { openPrintableWindow } from '../../../../services/printWindow';
import type { HarvestI18n } from '../../i18n';

type UseHarvestDetailsPrintActionsParams = {
  lang: 'he' | 'en';
  t: HarvestI18n;
  detailsPanelTitle: string;
  fieldReportDetailsFieldName: string | null;
  detailsPrintRef: RefObject<HTMLDivElement>;
  fieldReportDetailsPrintRef: RefObject<HTMLDivElement>;
  sortingDailyDetailsPrintRef: RefObject<HTMLDivElement>;
};

export function useHarvestDetailsPrintActions({
  lang,
  t,
  detailsPanelTitle,
  fieldReportDetailsFieldName,
  detailsPrintRef,
  fieldReportDetailsPrintRef,
  sortingDailyDetailsPrintRef,
}: UseHarvestDetailsPrintActionsParams) {
  const direction = lang === 'he' ? 'rtl' : 'ltr';

  const handlePrintDetails = () => {
    const printableNode = detailsPrintRef.current;
    if (!printableNode) {
      return;
    }

    openPrintableWindow({
      title: detailsPanelTitle,
      heading: t.dailyDetails.printHeading,
      direction,
      html: printableNode.outerHTML,
      width: 900,
      height: 700,
      extraStyles: HARVEST_DETAILS_PRINT_EXTRA_STYLES,
    });
  };

  const handlePrintFieldReportDetails = () => {
    const printableNode = fieldReportDetailsPrintRef.current;
    if (!printableNode) {
      return;
    }

    openPrintableWindow({
      title: fieldReportDetailsFieldName
        ? `${t.fieldReport.detailsTitle()} - ${fieldReportDetailsFieldName}`
        : detailsPanelTitle,
      heading: t.fieldReport.detailsTitle(),
      direction,
      html: printableNode.outerHTML,
      extraStyles: HARVEST_FIELD_REPORT_DETAILS_PRINT_EXTRA_STYLES,
    });
  };

  const handlePrintSortingDailyDetails = () => {
    const printableNode = sortingDailyDetailsPrintRef.current;
    if (!printableNode) {
      return;
    }

    openPrintableWindow({
      title: t.sortingDailyDetails.title,
      heading: t.sortingDailyDetails.title,
      direction,
      html: printableNode.outerHTML,
      extraStyles: HARVEST_SORTING_DAILY_DETAILS_PRINT_EXTRA_STYLES,
    });
  };

  return {
    handlePrintDetails,
    handlePrintFieldReportDetails,
    handlePrintSortingDailyDetails,
  };
}


