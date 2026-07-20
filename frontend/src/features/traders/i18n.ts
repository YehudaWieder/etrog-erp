import { getPreferredLanguage } from '../../utils/locale';
import {
	DEFAULT_TRADER_CATEGORIES_I18N_EN,
	TRADER_CATEGORIES_I18N_EN,
	TRADERS_I18N_EN,
	TRADER_INVENTORY_I18N_EN,
	TRADER_MOVEMENTS_I18N_EN,
} from './i18n.en';
import {
	DEFAULT_TRADER_CATEGORIES_I18N_HE,
	TRADER_CATEGORIES_I18N_HE,
	TRADERS_I18N_HE,
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
				unboxedOption: string;
				boxedOption: string;
				shippedOption: string;
				arrivedOption: string;
				selfPickupOption: string;
				privateSelectionOption: string;
			};
		loading: string;
		loadFailed: string;
		empty: string;
		retry: string;
		totals: {
			totalQuantity: string;
			traderQuantity: string;
			moduloQuantity: string;
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
	paymentRequired: string;
	addFailed: string;
	emptyName: string;
	invalidPercent: string;
	editFailed: string;
	deleteFailed: string;
	newTraderPlaceholder: string;
	paymentPlaceholder: string;
	addTrader: string;
	loading: string;
	empty: string;
	traderId: string;
	paymentPercentLabel: string;
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

export type TraderCategoriesI18n = {
	seasonFilterLabel: string;
	traderFilterLabel: string;
	activeSeasonBadge: string;
	allTradersOption: string;
	noActiveSeason: string;
	noSeasonSelected: string;
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
		typeOptions: {
			OWNERSHIP_TRANSFER: string;
			INTERNAL_TRANSFER: string;
			ASSIGNED: string;
			SELF_PICKUP: string;
			WASTE: string;
			ADJUSTMENT: string;
			PITAM_SPLIT: string;
			PITAM_SPLIT_UNDO: string;
		};
		fromTraderLabel: string;
		toTraderLabel: string;
		traderLabel: string;
		traderPlaceholder: string;
		moduloOption: string;
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
		pitamSplitUndoBatchLabel: string;
		pitamSplitUndoBatchPlaceholder: string;
		pitamSplitUndoNoBatches: string;
		pitamSplitUndoLoading: string;
		pitamSplitUndoSourceLabels: { SPECIFIC_TRADER: string; MODULO: string; GENERAL: string };
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

export function getTraderCategoriesI18n() {
	return TRADER_CATEGORIES_I18N[resolveAppLang()];
}

export function getDefaultTraderCategoriesI18n() {
	return DEFAULT_TRADER_CATEGORIES_I18N[resolveAppLang()];
}

export function getTraderMovementsI18n() {
	return TRADER_MOVEMENTS_I18N[resolveAppLang()];
}
