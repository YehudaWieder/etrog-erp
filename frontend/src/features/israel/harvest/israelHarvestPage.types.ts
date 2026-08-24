import type { GradeQuantityMatrix } from '../../harvest/utils/harvestClassificationMatrix.util';

export type IsraelHarvestFieldReportRow = {
  id: number;
  fieldName: string;
  recordCount: number;
  totalQuantity: number;
  avgQuantityPerHarvest: number;
};

export type IsraelHarvestExportTableData = {
  header: Array<string | number>;
  rows: Array<Array<string | number>>;
};

export type IsraelHarvestFormClassificationDraft = {
  id: string;
  fieldCategoryId: string;
  categoryId: string;
  notes: string;
  quantities: GradeQuantityMatrix;
  // True for a scaffold row auto-populated for an already-saved (fieldCategory, category) combo (see
  // buildInitialIsraelClassificationDraftsFromExisting). Its quantities stay empty on purpose: already-saved
  // cells are rendered from existingClassificationIds/existingHarvestClassifications as locked cells with an
  // add/subtract popup, not from this draft's own quantities matrix.
  isExistingScaffold?: boolean;
  existingClassificationIds?: number[];
};
