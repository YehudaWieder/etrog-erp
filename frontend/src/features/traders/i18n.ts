import { getPreferredLanguage } from '../../utils/locale';
import {
	DEFAULT_TRADER_CATEGORIES_I18N_EN,
	TRADER_CATEGORIES_I18N_EN,
	TRADERS_I18N_EN,
	TRADER_SEASON_SETTINGS_I18N_EN,
	TRADER_INVENTORY_I18N_EN,
	TRADER_MOVEMENTS_I18N_EN,
} from './i18n.en';
import {
	DEFAULT_TRADER_CATEGORIES_I18N_HE,
	TRADER_CATEGORIES_I18N_HE,
	TRADERS_I18N_HE,
	TRADER_SEASON_SETTINGS_I18N_HE,
	TRADER_INVENTORY_I18N_HE,
	TRADER_MOVEMENTS_I18N_HE,
} from './i18n.he';

export type AppLang = 'he' | 'en';

export type NavItem = {
	id: string;
	label: string;
	href?: string;
	icon?: string;
	badge?: number;
};

export type SidebarSection = {
	id: string;
	title: string;
	href?: string;
	icon?: string;
	items: NavItem[];
};

export type TraderInventoryI18n = {
	userNameFallback: string;
	topNav: NavItem[];
	sidebar: SidebarSection[];
	pageTitle: string;
	summary: {
		description: string;
			focusedExplanation: string;
			filters: {
				seasonLabel: string;
				traderLabel: string;
				allTradersOption: string;
				unassignedOption: string;
				inventoryStatusLabel: string;
				allInventoryOption: string;
				inventorySourceLabel: string;
				inventorySourceAllOption: string;
				inventorySourceGeneralOption: string;
				unboxedOption: string;
				boxedOption: string;
				shippedOption: string;
				arrivedOption: string;
				selfPickupOption: string;
				privateSelectionOption: string;
				remainsInItalyOption: string;
				transferredToCustomerOption: string;
			};
		loading: string;
		loadFailed: string;
		empty: string;
		retry: string;
		totals: {
			totalQuantity: string;
			traderQuantity: string;
			moduloQuantity: string;
			remainsInItalyQuantity: string;
			remainsInItalyNote: string;
			privateSelectionQuantity: string;
		};
		matrix: {
			title: string;
			grade: string;
			total: string;
		};
		breakdown: {
			showBreakdown: string;
			hideBreakdown: string;
			breakdownTitle: string;
		};
		columns: {
			owner: string;
			category: string;
			grade: string;
			pitamStatus: string;
			totalQuantity: string;
			lastUpdatedAt: string;
		};
		values: {
			modulo: string;
			traderOwned: string;
			none: string;
			neverUpdated: string;
			pitamStatus: {
				WITH_PITAM: string;
				WITHOUT_PITAM: string;
				MIXED: string;
			};
		};
	};
	emptyState: Record<string, { title: string; description: string }>;
};

export const TRADER_INVENTORY_I18N = {
	he: TRADER_INVENTORY_I18N_HE,
	en: TRADER_INVENTORY_I18N_EN,
} as const;

export type TradersI18n = {
	addFailed: string;
	emptyName: string;
	editFailed: string;
	deleteFailed: string;
	newTraderPlaceholder: string;
	addTrader: string;
	loading: string;
	empty: string;
	traderId: string;
	deleteTitle: string;
	deleteMessage: (name: string) => string;
	deleteFallback: string;
	deleteConfirm: string;
	cancel: string;
	editTitle: string;
	editMessage: (name: string) => string;
	editFallback: string;
	traderPlaceholder: string;
	save: string;
	saving: string;
	adding: string;
};

export type TraderSeasonSettingsI18n = {
	title: string;
	warningNotice: string;
	seasonFilterLabel: string;
	activeSeasonBadge: string;
	noActiveSeason: string;
	loading: string;
	noTraders: string;
	noAvailableTraders: string;
	loadFailed: string;
	addFailed: string;
	editFailed: string;
	deleteFailed: string;
	empty: string;
	seasonEmpty: string;
	traderLabel: string;
	selectTrader: string;
	traderIdLabel: string;
	paymentPercentLabel: string;
	paymentPercentPlaceholder: string;
	pricePerEtrogLabel: string;
	pricePerEtrogPlaceholder: string;
	currencyLabel: string;
	selectCurrency: string;
	invalidPercent: string;
	invalidPrice: string;
	addTitle: string;
	editTitle: string;
	addMessage: string;
	editMessage: (name: string) => string;
	editFallback: string;
	deleteTitle: string;
	deleteMessage: (name: string) => string;
	deleteFallback: string;
	deleteConfirm: string;
	cancel: string;
	save: string;
	saving: string;
};

export type TraderCategoriesI18n = {
	warningNotice: string;
	seasonFilterLabel: string;
	traderFilterLabel: string;
	activeSeasonBadge: string;
	allTradersOption: string;
	noActiveSeason: string;
	noSeasonSelected: string;
	nonActiveSeasonSelectionDisabled: string;
	addTitle: string;
	editTitle: string;
	addMessage: string;
	editMessage: (name: string) => string;
	categoryNameLabel: string;
	categoryNamePlaceholder: string;
	notesLabel: string;
	notesPlaceholder: string;
	allocationSectionTitle: string;
	supportedGradesLabel: string;
	gradeGroupsLabel: string;
	addGroupLabel: string;
	removeGroupLabel: string;
	groupNamePlaceholder: string;
	categoryId: string;
	sharesDetailsTitle: string;
	priorityLabel: string;
	dragHandleLabel: string;
	reorderFailed: string;
	selectTraderOption: string;
	percentPlaceholder: (index: number) => string;
	addRow: string;
	removeRow: string;
	totalPercentLabel: string;
	totalMustBeHundred: string;
	loading: string;
	noTraders: string;
	loadFailed: string;
	addFailed: string;
	editFailed: string;
	deleteFailed: string;
	emptyName: string;
	atLeastOneShare: string;
	selectTrader: string;
	uniqueTraders: string;
	invalidPercent: string;
	empty: string;
	deleteTitle: string;
	deleteMessage: (name: string) => string;
	deleteFallback: string;
	deleteConfirm: string;
	cancel: string;
	save: string;
	saving: string;
	shareRows: {
		incompleteLastRow: string;
		totalReachedHundred: string;
		allTradersSelected: string;
	};
};

export type DefaultTraderCategoriesI18n = {
	warningNotice: string;
	addTitle: string;
	editTitle: string;
	addMessage: string;
	editMessage: (name: string) => string;
	categoryNameLabel: string;
	categoryNamePlaceholder: string;
	notesLabel: string;
	notesPlaceholder: string;
	allocationSectionTitle: string;
	supportedGradesLabel: string;
	gradeGroupsLabel: string;
	addGroupLabel: string;
	removeGroupLabel: string;
	groupNamePlaceholder: string;
	categoryId: string;
	sharesDetailsTitle: string;
	priorityLabel: string;
	dragHandleLabel: string;
	reorderFailed: string;
	selectTraderOption: string;
	percentPlaceholder: (index: number) => string;
	addRow: string;
	removeRow: string;
	totalPercentLabel: string;
	totalMustBeHundred: string;
	createCategory: string;
	deleteCategory: string;
	loading: string;
	noTraders: string;
	loadFailed: string;
	addFailed: string;
	deleteFailed: string;
	emptyName: string;
	atLeastOneShare: string;
	selectTrader: string;
	uniqueTraders: string;
	invalidPercent: string;
	empty: string;
	sharesCount: (count: number) => string;
	deleteTitle: string;
	deleteMessage: (name: string) => string;
	deleteFallback: string;
	deleteConfirm: string;
	cancel: string;
	editFailed: string;
	save: string;
	saving: string;
	shareRows: {
		incompleteLastRow: string;
		totalReachedHundred: string;
		allTradersSelected: string;
	};
};

export type TraderMovementsI18n = {
	addMovementButton: string;
	nonActiveSeasonDisabled: string;
	columns: {
		date: string;
		type: string;
		trader: string;
		category: string;
		grade: string;
		pitamStatus: string;
		quantity: string;
	};
	filters: {
		title: string;
		seasonLabel: string;
		traderLabel: string;
		allTradersOption: string;
		unassignedOption: string;
		movementStatusLabel: string;
		allMovementsOption: string;
		nonShipmentMovementsOption: string;
		shipmentMovementsOption: string;
		categoryLabel: string;
		allCategoriesOption: string;
		gradeLabel: string;
		allGradesOption: string;
		pitamStatusLabel: string;
		allPitamStatusesOption: string;
	};
	movementTypes: Record<string, string>;
	pitamStatuses: Record<string, string>;
	summary: {
		totalInventory: string;
		notPacked: string;
		packed: string;
	};
	loading: string;
	error: string;
	retry: string;
	empty: string;
	noMatchingFilters: string;
	noFiltersLabel: string;
	tableActionsLabel: string;
	printAriaLabel: string;
	printTitle: string;
	exportAriaLabel: string;
	exportTitle: string;
	addMovementForm: {
		title: string;
		closeLabel: string;
		typeLabel: string;
		typePlaceholder: string;
		typeGroupRegular: string;
		typeGroupSpecial: string;
		typeGroupManage: string;
		typeBackLabel: string;
		typeOptions: {
			OWNERSHIP_TRANSFER: string;
			INTERNAL_TRANSFER: string;
			ASSIGNED: string;
			SELF_PICKUP: string;
			WASTE: string;
			ADJUSTMENT: string;
			PITAM_SPLIT: string;
			PITAM_SPLIT_MANAGE: string;
			REMAINS_IN_ITALY_WITHDRAWAL: string;
			REMAINS_IN_ITALY_WITHDRAWAL_MANAGE: string;
			RECLASSIFICATION: string;
			RECLASSIFICATION_MANAGE: string;
		};
		fromTraderLabel: string;
		toTraderLabel: string;
		traderLabel: string;
		traderPlaceholder: string;
		moduloOption: string;
		destinationLabel: string;
		destinationPlaceholder: string;
		destinationOptions: { TRADER: string; CUSTOMER: string; GENERAL: string };
		wasteSourceLabel: string;
		wasteSourcePlaceholder: string;
		itemStockSourceLabel: string;
		itemStockSourcePlaceholder: string;
		itemStockSourceOptions: { GENERAL: string; PRIVATE_SELECTION: string };
		customerLabel: string;
		customerPlaceholder: string;
		traderCategoryLabel: string;
		traderCategoryPlaceholder: string;
		customerCategoryLabel: string;
		customerCategoryPlaceholder: string;
		gradeLabel: string;
		gradePlaceholder: string;
		pitamStatusLabel: string;
		pitamStatusPlaceholder: string;
		customerPitamStatusLabel: string;
		quantityLabel: string;
		quantityPlaceholder: string;
		pitamSplitSourceLabel: string;
		pitamSplitSourcePlaceholder: string;
		pitamSplitSourceOptions: { SPECIFIC_TRADER: string; MODULO: string; GENERAL: string };
		pitamSplitWithLabel: string;
		pitamSplitWithoutLabel: string;
		pitamSplitAvailableLabel: (quantity: number) => string;
		pitamSplitExceedsAvailableError: (quantity: number) => string;
		pitamSplitInsufficientStockError: string;
		pitamSplitUndoBatchLabel: string;
		pitamSplitUndoBatchPlaceholder: string;
		pitamSplitUndoNoBatches: string;
		pitamSplitUndoLoading: string;
		pitamSplitUndoSourceLabels: { SPECIFIC_TRADER: string; MODULO: string; GENERAL: string };
		pitamSplitManageUpdateLabel: string;
		pitamSplitManageCancelSplitLabel: string;
		pitamSplitManageCancelingLabel: string;
		pitamSplitManageSaveLabel: string;
		pitamSplitManageSavingLabel: string;
		pitamSplitManageDiscardEditLabel: string;
		riwUndoBatchLabel: string;
		riwUndoBatchPlaceholder: string;
		riwUndoNoBatches: string;
		riwUndoLoading: string;
		riwManageUpdateLabel: string;
		riwManageCancelLabel: string;
		riwManageCancelingLabel: string;
		riwManageSaveLabel: string;
		riwManageSavingLabel: string;
		riwManageDiscardEditLabel: string;
		reclassificationSourceLabel: string;
		reclassificationSourcePlaceholder: string;
		reclassificationSourceOptions: { SPECIFIC_TRADER: string; GENERAL: string; REMAINS_IN_ITALY: string };
		reclassificationFromLabel: string;
		reclassificationToLabel: string;
		reclassificationRemainsInItalyGradeHLabel: string;
		reclassificationRemainsInItalyGradeVLabel: string;
		reclassificationOwnershipLabel: string;
		reclassificationOwnershipPlaceholder: string;
		reclassificationOwnershipGeneralOption: string;
		reclassificationAvailableLabel: (quantity: number) => string;
		reclassificationExceedsAvailableError: (quantity: number) => string;
		reclassificationInsufficientStockError: string;
		reclassificationSameTupleError: string;
		reclassificationUndoBatchLabel: string;
		reclassificationUndoBatchPlaceholder: string;
		reclassificationUndoNoBatches: string;
		reclassificationUndoLoading: string;
		reclassificationManageUpdateLabel: string;
		reclassificationManageCancelLabel: string;
		reclassificationManageCancelingLabel: string;
		reclassificationManageSaveLabel: string;
		reclassificationManageSavingLabel: string;
		reclassificationManageDiscardEditLabel: string;
		availableToCancelLabel: string;
		fullyPackedLabel: string;
		partialCancelConfirmTitle: string;
		partialCancelConfirmMessage: (available: number, requested: number) => string;
		partialCancelConfirmLabel: string;
		partialCancelDismissLabel: string;
		availableQuantityHint: (quantity: number) => string;
		adjustmentQuantityHint: string;
		notesLabel: string;
		notesPlaceholder: string;
		cancel: string;
		save: string;
		saving: string;
		validationRequired: string;
		validationSameTrader: string;
	};
};

const TRADERS_I18N: Record<AppLang, TradersI18n> = {
	he: TRADERS_I18N_HE,
	en: TRADERS_I18N_EN,
};

const TRADER_SEASON_SETTINGS_I18N: Record<AppLang, TraderSeasonSettingsI18n> = {
	he: TRADER_SEASON_SETTINGS_I18N_HE,
	en: TRADER_SEASON_SETTINGS_I18N_EN,
};

const TRADER_CATEGORIES_I18N: Record<AppLang, TraderCategoriesI18n> = {
	he: TRADER_CATEGORIES_I18N_HE,
	en: TRADER_CATEGORIES_I18N_EN,
};

const DEFAULT_TRADER_CATEGORIES_I18N: Record<AppLang, DefaultTraderCategoriesI18n> = {
	he: DEFAULT_TRADER_CATEGORIES_I18N_HE,
	en: DEFAULT_TRADER_CATEGORIES_I18N_EN,
};

const TRADER_MOVEMENTS_I18N: Record<AppLang, TraderMovementsI18n> = {
	he: TRADER_MOVEMENTS_I18N_HE,
	en: TRADER_MOVEMENTS_I18N_EN,
};

function resolveAppLang(): AppLang {
	return getPreferredLanguage('he').toLowerCase().startsWith('en') ? 'en' : 'he';
}

export function resolveTradersAppLang(): AppLang {
	return resolveAppLang();
}

export function getTradersI18n() {
	return TRADERS_I18N[resolveAppLang()];
}

export function getTraderSeasonSettingsI18n() {
	return TRADER_SEASON_SETTINGS_I18N[resolveAppLang()];
}

export function getTraderCategoriesI18n() {
	return TRADER_CATEGORIES_I18N[resolveAppLang()];
}

export function getDefaultTraderCategoriesI18n() {
	return DEFAULT_TRADER_CATEGORIES_I18N[resolveAppLang()];
}

export function getTraderMovementsI18n() {
	return TRADER_MOVEMENTS_I18N[resolveAppLang()];
}
