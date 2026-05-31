import { getPreferredLanguage } from '../../utils/locale';

type AppLang = 'he' | 'en';

type TradersI18n = {
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
};

type TraderCategoriesI18n = {
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
	categoryId: string;
	sharesDetailsTitle: string;
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
};

type DefaultTraderCategoriesI18n = {
	addTitle: string;
	editTitle: string;
	addMessage: string;
	editMessage: (name: string) => string;
	categoryNameLabel: string;
	categoryNamePlaceholder: string;
	notesLabel: string;
	notesPlaceholder: string;
	allocationSectionTitle: string;
	categoryId: string;
	sharesDetailsTitle: string;
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
};

const TRADERS_I18N: Record<AppLang, TradersI18n> = {
	he: {
		paymentRequired: 'אחוז התשלום הוא שדה חובה.',
		addFailed: 'הוספת הסוחר נכשלה.',
		emptyName: 'שם הסוחר לא יכול להיות ריק.',
		invalidPercent: 'אחוז התשלום חייב להיות בין 0 ל-100.',
		editFailed: 'עדכון הסוחר נכשל.',
		deleteFailed: 'לא ניתן למחוק את הסוחר שנבחר.',
		newTraderPlaceholder: 'שם סוחר חדש',
		paymentPlaceholder: 'אחוז תשלום בהוצאות',
		addTrader: 'הוסף סוחר',
		loading: 'טוען סוחרים...',
		empty: 'אין סוחרים להצגה כרגע.',
		traderId: 'מזהה סוחר',
		paymentPercentLabel: 'אחוז תשלום',
		deleteTitle: 'מחיקת סוחר',
		deleteMessage: (name) => `האם למחוק את הסוחר ${name}? פעולה זו לא ניתנת לשחזור.`,
		deleteFallback: 'האם למחוק את הסוחר שנבחר?',
		deleteConfirm: 'מחק',
		cancel: 'ביטול',
		editTitle: 'עריכת סוחר',
		editMessage: (name) => `עדכון פרטי הסוחר ${name}`,
		editFallback: 'עדכון פרטי סוחר נבחר',
		traderPlaceholder: 'שם סוחר',
		save: 'שמור',
	},
	en: {
		paymentRequired: 'Payment percent is required.',
		addFailed: 'Failed to add trader.',
		emptyName: 'Trader name cannot be empty.',
		invalidPercent: 'Payment percent must be between 0 and 100.',
		editFailed: 'Failed to update trader.',
		deleteFailed: 'Unable to delete the selected trader.',
		newTraderPlaceholder: 'New trader name',
		paymentPlaceholder: 'Expense payment percent',
		addTrader: 'Add trader',
		loading: 'Loading traders...',
		empty: 'No traders to display yet.',
		traderId: 'Trader ID',
		paymentPercentLabel: 'Payment percent',
		deleteTitle: 'Delete trader',
		deleteMessage: (name) => `Delete trader ${name}? This action cannot be undone.`,
		deleteFallback: 'Delete the selected trader?',
		deleteConfirm: 'Delete',
		cancel: 'Cancel',
		editTitle: 'Edit trader',
		editMessage: (name) => `Update trader details for ${name}`,
		editFallback: 'Update selected trader details',
		traderPlaceholder: 'Trader name',
		save: 'Save',
	},
};

const TRADER_CATEGORIES_I18N: Record<AppLang, TraderCategoriesI18n> = {
	he: {
		seasonFilterLabel: 'סינון לפי עונה',
		traderFilterLabel: 'סינון לפי סוחר',
		activeSeasonBadge: 'פעילה',
		allTradersOption: 'כל הסוחרים',
		noActiveSeason: 'אין עונה פעילה כרגע',
		noSeasonSelected: 'יש לבחור עונה כדי לנהל קטגוריות סוחרים.',
		addTitle: 'הוספת קטגוריית סוחרים',
		editTitle: 'עריכת קטגוריית סוחרים',
		addMessage: 'צור קטגוריה עונתית עם חלוקת אחוזים בין סוחרים. סכום השורות חייב להיות 100%.',
		editMessage: (name) => `עדכון קטגוריית הסוחרים ${name}`,
		categoryNameLabel: 'שם קטגוריה',
		categoryNamePlaceholder: 'שם קטגוריה (לדוגמה: חזו"א)',
		notesLabel: 'הערות',
		notesPlaceholder: 'הערות (לא חובה)',
		allocationSectionTitle: 'פירוט חלוקת הקטגוריה באחוזים',
		categoryId: 'מזהה קטגוריה',
		sharesDetailsTitle: 'פירוט חלוקה',
		selectTraderOption: 'בחר סוחר',
		percentPlaceholder: (_index) => 'אחוז מהקטגוריה',
		addRow: 'הוסף שורה',
		removeRow: 'הסר שורה',
		totalPercentLabel: 'סה"כ אחוזים',
		totalMustBeHundred: 'סך האחוזים חייב להיות בדיוק 100%.',
		loading: 'טוען קטגוריות סוחרים...',
		noTraders: 'לא נמצאו סוחרים. יש להוסיף סוחר לפני יצירת קטגוריה.',
		loadFailed: 'טעינת קטגוריות הסוחרים נכשלה.',
		addFailed: 'יצירת קטגוריית הסוחרים נכשלה.',
		editFailed: 'עדכון קטגוריית הסוחרים נכשל.',
		deleteFailed: 'מחיקת קטגוריית הסוחרים נכשלה.',
		emptyName: 'שם הקטגוריה לא יכול להיות ריק.',
		atLeastOneShare: 'יש להוסיף לפחות שורת חלוקה אחת.',
		selectTrader: 'יש לבחור סוחר בכל השורות.',
		uniqueTraders: 'לא ניתן לבחור אותו סוחר יותר מפעם אחת.',
		invalidPercent: 'האחוז בכל שורה חייב להיות גדול מ-0 ועד 100.',
		empty: 'אין קטגוריות סוחרים להצגה בעונה הנבחרת.',
		deleteTitle: 'מחיקת קטגוריית סוחרים',
		deleteMessage: (name) => `האם למחוק את קטגוריית הסוחרים ${name}?`,
		deleteFallback: 'האם למחוק את קטגוריית הסוחרים שנבחרה?',
		deleteConfirm: 'מחק',
		cancel: 'ביטול',
		save: 'שמור',
	},
	en: {
		seasonFilterLabel: 'Filter by season',
		traderFilterLabel: 'Filter by trader',
		activeSeasonBadge: 'Active',
		allTradersOption: 'All traders',
		noActiveSeason: 'No active season right now',
		noSeasonSelected: 'Select a season to manage trader categories.',
		addTitle: 'Add trader category',
		editTitle: 'Edit trader category',
		addMessage: 'Create a seasonal category with trader allocation rows. Total of all rows must be 100%.',
		editMessage: (name) => `Update trader category ${name}`,
		categoryNameLabel: 'Category name',
		categoryNamePlaceholder: 'Category name (for example: Chazon Ish)',
		notesLabel: 'Notes',
		notesPlaceholder: 'Notes (optional)',
		allocationSectionTitle: 'Category allocation breakdown (%)',
		categoryId: 'Category ID',
		sharesDetailsTitle: 'Distribution details',
		selectTraderOption: 'Select trader',
		percentPlaceholder: (index) => `Row ${index} percent`,
		addRow: 'Add row',
		removeRow: 'Remove row',
		totalPercentLabel: 'Total percent',
		totalMustBeHundred: 'Total percent must be exactly 100%.',
		loading: 'Loading trader categories...',
		noTraders: 'No traders found. Add at least one trader before creating a category.',
		loadFailed: 'Failed to load trader categories.',
		addFailed: 'Failed to create trader category.',
		editFailed: 'Failed to update trader category.',
		deleteFailed: 'Failed to delete trader category.',
		emptyName: 'Category name cannot be empty.',
		atLeastOneShare: 'At least one share row is required.',
		selectTrader: 'Please select a trader in each row.',
		uniqueTraders: 'Each trader can appear only once in the category.',
		invalidPercent: 'Each share percent must be greater than 0 and up to 100.',
		empty: 'No trader categories to display for the selected season.',
		deleteTitle: 'Delete trader category',
		deleteMessage: (name) => `Delete trader category ${name}?`,
		deleteFallback: 'Delete the selected trader category?',
		deleteConfirm: 'Delete',
		cancel: 'Cancel',
		save: 'Save',
	},
};

const DEFAULT_TRADER_CATEGORIES_I18N: Record<AppLang, DefaultTraderCategoriesI18n> = {
	he: {
		addTitle: 'הוספת קטגוריית סוחרים ברירת מחדל',
		editTitle: 'עריכת קטגוריית סוחרים ברירת מחדל',
		addMessage: 'צור קטגוריה עם חלוקת אחוזים בין סוחרים. סכום כל השורות חייב להיות 100%.',
		editMessage: (name) => `עדכון קטגוריית ברירת המחדל ${name}`,
		categoryNameLabel: 'שם קטגוריה',
		categoryNamePlaceholder: 'שם קטגוריה (לדוגמה: יאנעווע)',
		notesLabel: 'הערות',
		notesPlaceholder: 'הערות (לא חובה)',
		allocationSectionTitle: 'פירוט חלוקת הקטגוריה באחוזים',
		categoryId: 'מזהה קטגוריה',
		sharesDetailsTitle: 'פירוט חלוקה',
		selectTraderOption: 'בחר סוחר',
		percentPlaceholder: (_index) => 'אחוז מהקטגוריה',
		addRow: 'הוסף שורה',
		removeRow: 'הסר שורה',
		totalPercentLabel: 'סה"כ אחוזים',
		totalMustBeHundred: 'סך האחוזים חייב להיות בדיוק 100%.',
		createCategory: 'צור קטגוריה',
		deleteCategory: 'מחק קטגוריה נבחרת',
		loading: 'טוען קטגוריות ברירת מחדל...',
		noTraders: 'לא נמצאו סוחרים. יש להוסיף סוחר לפני יצירת קטגוריה.',
		loadFailed: 'טעינת קטגוריות ברירת המחדל נכשלה.',
		addFailed: 'יצירת הקטגוריה נכשלה.',
		deleteFailed: 'מחיקת הקטגוריה נכשלה.',
		emptyName: 'שם הקטגוריה לא יכול להיות ריק.',
		atLeastOneShare: 'יש להוסיף לפחות שורת חלוקה אחת.',
		selectTrader: 'יש לבחור סוחר בכל השורות.',
		uniqueTraders: 'לא ניתן לבחור אותו סוחר יותר מפעם אחת.',
		invalidPercent: 'האחוז בכל שורה חייב להיות גדול מ-0 ועד 100.',
		empty: 'אין קטגוריות סוחרים ברירת מחדל להצגה כרגע.',
		sharesCount: (count) => `${count} שורות חלוקה`,
		deleteTitle: 'מחיקת קטגוריית ברירת מחדל',
		deleteMessage: (name) => `האם למחוק את קטגוריית ברירת המחדל ${name}?`,
		deleteFallback: 'האם למחוק את קטגוריית ברירת המחדל שנבחרה?',
		deleteConfirm: 'מחק',
		cancel: 'ביטול',
		editFailed: 'עדכון הקטגוריה נכשל.',
		save: 'שמור',
	},
	en: {
		addTitle: 'Add default trader category',
		editTitle: 'Edit default trader category',
		addMessage: 'Create a category with trader allocation rows. Total of all rows must be 100%.',
		editMessage: (name) => `Update default category ${name}`,
		categoryNameLabel: 'Category name',
		categoryNamePlaceholder: 'Category name (for example: Yanover)',
		notesLabel: 'Notes',
		notesPlaceholder: 'Notes (optional)',
		allocationSectionTitle: 'Category allocation breakdown (%)',
		categoryId: 'Category ID',
		sharesDetailsTitle: 'Distribution details',
		selectTraderOption: 'Select trader',
		percentPlaceholder: (index) => `Row ${index} percent`,
		addRow: 'Add row',
		removeRow: 'Remove row',
		totalPercentLabel: 'Total percent',
		totalMustBeHundred: 'Total percent must be exactly 100%.',
		createCategory: 'Create category',
		deleteCategory: 'Delete selected category',
		loading: 'Loading default trader categories...',
		noTraders: 'No traders found. Add at least one trader before creating a category.',
		loadFailed: 'Failed to load default trader categories.',
		addFailed: 'Failed to create default trader category.',
		deleteFailed: 'Failed to delete default trader category.',
		emptyName: 'Category name cannot be empty.',
		atLeastOneShare: 'At least one share row is required.',
		selectTrader: 'Please select a trader in each row.',
		uniqueTraders: 'Each trader can appear only once in the category.',
		invalidPercent: 'Each share percent must be greater than 0 and up to 100.',
		empty: 'No default trader categories to display yet.',
		sharesCount: (count) => `${count} share rows`,
		deleteTitle: 'Delete default trader category',
		deleteMessage: (name) => `Delete default category ${name}?`,
		deleteFallback: 'Delete the selected default category?',
		deleteConfirm: 'Delete',
		cancel: 'Cancel',
		editFailed: 'Failed to update default trader category.',
		save: 'Save',
	},
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
