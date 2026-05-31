import type { RefObject } from 'react';
import {
  HARVEST_DETAILS_PRINT_EXTRA_STYLES,
  HARVEST_FIELD_REPORT_DETAILS_PRINT_EXTRA_STYLES,
  HARVEST_SORTING_DAILY_DETAILS_PRINT_EXTRA_STYLES,
} from '../../services/harvestPrintStyles';
import { openPrintableWindow } from '../../../../utils/printWindow';

type UseHarvestDetailsPrintActionsParams = {
  lang: 'he' | 'en';
  detailsPanelTitle: string;
  fieldReportDetailsFieldName: string | null;
  detailsPrintRef: RefObject<HTMLDivElement>;
  fieldReportDetailsPrintRef: RefObject<HTMLDivElement>;
  sortingDailyDetailsPrintRef: RefObject<HTMLDivElement>;
};

export function useHarvestDetailsPrintActions({
  lang,
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
      heading: lang === 'he' ? 'פרטי קטיף' : 'Harvest Details',
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
        ? `${lang === 'he' ? 'פרטי שדה' : 'Field Details'} - ${fieldReportDetailsFieldName}`
        : detailsPanelTitle,
      heading: lang === 'he' ? 'פרטי שדה' : 'Field Details',
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
      title: lang === 'he' ? 'פרטי מיון יומי' : 'Daily Sorting Details',
      heading: lang === 'he' ? 'פרטי מיון יומי' : 'Daily Sorting Details',
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


