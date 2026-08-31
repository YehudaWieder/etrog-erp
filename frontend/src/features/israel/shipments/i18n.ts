import type { NavItem, SidebarSection } from '../../../types/navigation';
import type { IsraelShipmentStatus } from '../../../services/israel/israelShipmentsApi';
import type { IsraelBoxStatus } from '../../../services/israel/israelBoxesApi';
import type { IsraelPitamStatus } from '../../../services/israel/israelClassificationsApi';
import type {
  IsraelAllShipmentsTableLabels,
  IsraelAllBoxesTableLabels,
  IsraelShipmentItemsTableLabels,
  IsraelFieldShipmentItemsTableLabels,
  IsraelShipmentItemsSummaryTableLabels,
} from './israelShipments.types';
import { ISRAEL_SHIPMENTS_I18N_EN } from './i18n.en';
import { ISRAEL_SHIPMENTS_I18N_HE } from './i18n.he';

type EmptyStateContent = {
  title: string;
  description: string;
};

export type IsraelShipmentsI18n = {
  userNameFallback: string;
  topNav: NavItem[];
  sidebar: SidebarSection[];
  pageTitle: string;
  settings: string;
  emptyState: Record<string, EmptyStateContent> & {
    default: EmptyStateContent;
  };
  pageControls: {
    addShipment: string;
    addBox: string;
    packItems: string;
    edit: string;
    delete: string;
    nonActiveSeasonDisabled: string;
  };
  newShipmentModal: {
    title: string;
    description: string;
    shipmentNumberLabel: string;
    shipmentNumberPlaceholder: string;
    fieldLabel: string;
    fieldPlaceholder: string;
    notesLabel: string;
    notesPlaceholder: string;
    save: string;
    saving: string;
    cancel: string;
    validationRequired: string;
    validationPositive: string;
    validationFieldRequired: string;
    duplicateShipmentNumber: string;
    genericError: string;
  };
  editShipmentModal: {
    title: (num: number) => string;
    shipmentNumberLabel: string;
    fieldLabel: string;
    fieldPlaceholder: string;
    fieldLockedHint: string;
    statusLabel: string;
    shippedAtLabel: string;
    notesLabel: string;
    notesPlaceholder: string;
    save: string;
    saving: string;
    cancel: string;
    statusOptions: Record<IsraelShipmentStatus, string>;
    shipmentNumberRequired: string;
    shipmentNumberInvalid: string;
    validationFieldRequired: string;
    shippedAtRequired: string;
    shippedAtYearMismatch: string;
    duplicateShipmentNumber: string;
    genericError: string;
  };
  deleteShipmentDialog: {
    title: (num: number) => string;
    message: (num: number) => string;
    confirm: string;
    cancel: string;
    conflictError: string;
    genericError: string;
  };
  allShipmentsTableLabels: IsraelAllShipmentsTableLabels;
  newBoxModal: {
    title: string;
    description: string;
    singleModeLabel: string;
    bulkModeLabel: string;
    shipmentNumberLabel: string;
    shipmentNumberPlaceholder: string;
    unassignedOption: string;
    fieldLabel: string;
    fieldPlaceholder: string;
    boxNumberLabel: string;
    boxNumberPlaceholder: string;
    notesLabel: string;
    notesPlaceholder: string;
    startNumberLabel: string;
    startNumberPlaceholder: string;
    endNumberLabel: string;
    endNumberPlaceholder: string;
    save: string;
    saving: string;
    cancel: string;
    validationBoxNumberRequired: string;
    validationBoxNumberPositive: string;
    validationStartNumberRequired: string;
    validationEndNumberRequired: string;
    validationRangeInvalid: string;
    validationRangeTooLarge: (max: number) => string;
    validationFieldRequired: string;
    duplicateBoxNumber: string;
    duplicateBoxNumbersInRange: (numbers: string) => string;
    genericError: string;
  };
  editBoxModal: {
    title: (num: number) => string;
    shipmentLabel: string;
    shipmentPlaceholder: string;
    unassignedOption: string;
    fieldLabel: string;
    fieldPlaceholder: string;
    fieldLockedHint: string;
    boxNumberLabel: string;
    statusLabel: string;
    notesLabel: string;
    notesPlaceholder: string;
    save: string;
    saving: string;
    cancel: string;
    statusOptions: Record<IsraelBoxStatus, string>;
    validationBoxNumberRequired: string;
    validationBoxNumberPositive: string;
    validationFieldRequired: string;
    duplicateBoxNumber: string;
    genericError: string;
  };
  deleteBoxDialog: {
    title: (num: number) => string;
    message: (num: number) => string;
    confirm: string;
    cancel: string;
    conflictError: string;
    genericError: string;
  };
  deleteBoxesBulkDialog: {
    title: (count: number) => string;
    message: (boxNumbers: number[]) => string;
    confirm: string;
    cancel: string;
    conflictError: string;
    genericError: string;
  };
  allBoxesTableLabels: IsraelAllBoxesTableLabels;
  packItemsModal: {
    title: string;
    description: string;
    boxLabel: string;
    boxPlaceholder: string;
    boxLoadingLabel: string;
    boxNoMatchesLabel: string;
    unassignedGroupLabel: string;
    shipmentGroupLabel: (shipmentNumber: number) => string;
    noBoxSelectedHint: string;
    shipmentDisplayLabel: string;
    boxNumberDisplayLabel: string;
    fieldDisplayLabel: string;
    statusDisplayLabel: string;
    itemsInBoxDisplayLabel: string;
    boxNotesDisplayLabel: string;
    unassignedShipmentValue: string;
    categoryLabel: string;
    categoryPlaceholder: string;
    pitamStatusColumnLabel: string;
    noGradeColumnLabel: string;
    quantityPlaceholder: string;
    availableQuantityHint: (n: number) => string;
    existingQuantityHint: (n: number) => string;
    addExistingItemQuantityLabel: string;
    cancelExistingItemEditLabel: string;
    addExistingItemQuantityPopupTitle: string;
    addExistingItemQuantityPopupPrefix: string;
    addExistingItemQuantityPopupGradeWord: string;
    addExistingItemQuantityPopupInstruction: string;
    addExistingItemQuantityConfirmLabel: string;
    addExistingItemQuantityInvalidError: string;
    existingItemQuantityAddModeLabel: string;
    existingItemQuantitySubtractModeLabel: string;
    subtractExistingItemQuantityConfirmLabel: string;
    subtractExistingItemQuantityInvalidError: string;
    subtractExistingItemQuantityExceedsBaseError: (n: number) => string;
    addExistingItemQuantityAvailableHint: (n: number) => string;
    addExistingItemQuantityExceedsAvailableError: (n: number) => string;
    subtractExistingItemQuantityToZeroHint: string;
    cellQuantityExceedsAvailableHint: (n: number) => string;
    notesLabel: string;
    notesPlaceholder: string;
    save: string;
    saving: string;
    cancel: string;
    validationBoxRequired: string;
    validationRowsRequired: string;
    boxOverCapacityHint: (entered: number, remaining: number) => string;
    boxFullHint: string;
    boxNotOpenError: string;
    genericError: string;
    itemRows: {
      title: string;
      addRow: string;
      removeRow: string;
      rowPrefix: (index: number) => string;
      emptyHint: string;
      addRowDisabledHint: string;
      totalPackedQuantityLabel: string;
      remainingCapacityHint: (n: number) => string;
      pendingRemovedItemRowsTitle: string;
      pendingRemovedItemRowsHint: string;
      restorePendingRemovedItemRow: string;
    };
  };
  editShipmentItemModal: {
    title: (id: number) => string;
    categoryLabel: string;
    gradeLabel: string;
    pitamStatusLabel: string;
    pitamStatusLabels: Record<IsraelPitamStatus, string>;
    quantityLabel: string;
    quantityPlaceholder: string;
    availableQuantityHint: (n: number) => string;
    notesLabel: string;
    notesPlaceholder: string;
    save: string;
    saving: string;
    cancel: string;
    validationQuantityRequired: string;
    validationQuantityPositive: string;
    validationQuantityExceedsAvailable: string;
    boxNotOpenError: string;
    genericError: string;
  };
  deleteShipmentItemDialog: {
    title: (id: number) => string;
    message: (id: number) => string;
    confirm: string;
    cancel: string;
    conflictError: string;
    genericError: string;
  };
  shipmentItemsTableLabels: IsraelShipmentItemsTableLabels;
  fieldShipmentItemsTableLabels: IsraelFieldShipmentItemsTableLabels;
  shipmentItemsSummaryTableLabels: IsraelShipmentItemsSummaryTableLabels;
};

export const ISRAEL_SHIPMENTS_I18N: Record<'he' | 'en', IsraelShipmentsI18n> = {
  he: ISRAEL_SHIPMENTS_I18N_HE,
  en: ISRAEL_SHIPMENTS_I18N_EN,
};
