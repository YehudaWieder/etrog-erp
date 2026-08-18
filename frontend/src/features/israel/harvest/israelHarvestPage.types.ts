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
};
