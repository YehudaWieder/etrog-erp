// Maps known backend validation/error messages (raw English strings thrown by Nest
// BadRequestException/NotFoundException/ConflictException) to Hebrew, so users see a
// localized message instead of the raw server text. Add new entries here whenever a new
// backend error message surfaces untranslated in the UI — no need to touch the backend.

const SIDE_LABELS_HE: Record<string, string> = {
  from: 'מקור',
  to: 'יעד',
};

const CONTEXT_LABELS_HE: Record<string, string> = {
  'Inventory transfer source check': 'בדיקת מלאי להעברה',
  'Trader movement validation': 'בדיקת תנועת מלאי לסוחר',
  'Customer movement validation': 'בדיקת תנועת מלאי ללקוח',
  'Packing TRADER item': 'אריזת פריט של סוחר',
  'Packing CUSTOMER item': 'אריזת פריט של לקוח',
  'Packing GENERAL item (trader portion)': 'אריזת פריט כללי (חלק הסוחר)',
  'Packing GENERAL item (modulo fallback)': 'אריזת פריט כללי (גיבוי מהכללי)',
};

const EXACT_TRANSLATIONS_HE: Record<string, string> = {
  'quantity must be a positive number': 'הכמות חייבת להיות מספר חיובי',
  'quantity must be a positive integer': 'הכמות חייבת להיות מספר שלם חיובי',
  'quantity must be a non-zero number': 'הכמות חייבת להיות שונה מאפס',
  'date is required': 'יש להזין תאריך',
  'dateHebrew is required': 'יש להזין תאריך עברי',
  'fromTraderId must be empty when fromOwnerType is MODULO': 'לא ניתן לבחור סוחר מקור כאשר המקור הוא כללי',
  'toOwnerType MODULO is not supported for transfer target': 'לא ניתן להעביר אל "כללי"',
  'fromTraderId is required when fromOwnerType=TRADER': 'יש לבחור סוחר מקור',
  'fromCustomerId is required when fromOwnerType=CUSTOMER': 'יש לבחור לקוח מקור',
  'toTraderId is required when toOwnerType=TRADER': 'יש לבחור סוחר מקבל',
  'toCustomerId is required when toOwnerType=CUSTOMER': 'יש לבחור לקוח מקבל',
  'customerId is required': 'יש לבחור לקוח',
  'customerCategoryId is required': 'יש לבחור קטגוריית לקוח',
  'traderCategoryId is required': 'יש לבחור קטגוריית סוחר',
  'grade is required': 'יש לבחור דרגה',
  'pitamStatus is required': 'יש לבחור סטטוס פיטם',
  'INTERNAL_TRANSFER must be between TRADER and CUSTOMER': 'העברה ללקוח חייבת להיות בין סוחר לבין לקוח',
  'OWNERSHIP_TRANSFER must be TRADER -> TRADER': 'העברת בעלות חייבת להיות בין שני סוחרים',
  'fromTraderId and toTraderId must be different for OWNERSHIP_TRANSFER': 'סוחר המקור וסוחר המקבל חייבים להיות שונים',
  'ASSIGNED manual flow must be MODULO -> TRADER': 'הקצאה חייבת להיות מהמלאי הכללי לסוחר',
  'type is required for adjustment movement': 'יש לבחור סוג תנועה',
  'type must be WASTE, ADJUSTMENT, or SELF_PICKUP': 'סוג התנועה חייב להיות פחת, תיקון ידני או איסוף עצמי',
  'quantity is required for adjustment movement': 'יש להזין כמות',
  'Negative trader movement requires traderCategoryId, grade, and pitamStatus':
    'תנועה שמפחיתה מלאי מחייבת בחירת קטגוריה, דרגה וסטטוס פיטם',
  'Modulo movements must use traderId=null': 'תנועות מהמלאי הכללי לא יכולות להיות משויכות לסוחר',
  'Trader movement requires traderId when isModulo=false': 'יש לבחור סוחר',
  'Cannot delete trader stock movement because related records exist in the system.':
    'לא ניתן למחוק את התנועה כי קיימות רשומות מקושרות במערכת',
  'Ledger mismatch while updating transfer operation': 'חוסר התאמה בנתוני ההעברה בעת העדכון',
};

type PatternTranslation = {
  regex: RegExp;
  translate: (...groups: string[]) => string;
};

const PATTERN_TRANSLATIONS_HE: PatternTranslation[] = [
  {
    regex: /^(.+?): insufficient unshipped trader stock\. Required=([\d.]+), available=([\d.]+)$/,
    translate: (context, required, available) =>
      `${CONTEXT_LABELS_HE[context] ?? context}: אין מספיק מלאי זמין לסוחר. נדרש: ${required}, קיים: ${available}`,
  },
  {
    regex: /^(.+?): insufficient unshipped customer stock\. Required=([\d.]+), available=([\d.]+)$/,
    translate: (context, required, available) =>
      `${CONTEXT_LABELS_HE[context] ?? context}: אין מספיק מלאי זמין ללקוח. נדרש: ${required}, קיים: ${available}`,
  },
  {
    regex: /^(from|to)PitamStatus is required$/,
    translate: (side) => `יש לבחור סטטוס פיטם (${SIDE_LABELS_HE[side] ?? side})`,
  },
  {
    regex: /^(from|to)TraderCategoryId is required for trader\/modulo movements$/,
    translate: (side) => `יש לבחור קטגוריית סוחר (${SIDE_LABELS_HE[side] ?? side})`,
  },
  {
    regex: /^(from|to)Grade is required for trader\/modulo movements$/,
    translate: (side) => `יש לבחור דרגה (${SIDE_LABELS_HE[side] ?? side})`,
  },
  {
    regex: /^(from|to)CustomerCategoryId is required for customer movements$/,
    translate: (side) => `יש לבחור קטגוריית לקוח (${SIDE_LABELS_HE[side] ?? side})`,
  },
  {
    regex: /^(from|to)CustomerCategoryId does not belong to (from|to)CustomerId$/,
    translate: (side) => `קטגוריית הלקוח שנבחרה לא משויכת ללקוח (${SIDE_LABELS_HE[side] ?? side})`,
  },
  {
    regex: /^Unsupported transfer type: (.+)$/,
    translate: (type) => `סוג תנועה לא נתמך: ${type}`,
  },
  {
    regex: /^Trader adjustment (\d+) not found$/,
    translate: (id) => `תנועת ההתאמה (#${id}) לא נמצאה`,
  },
];

/**
 * Translates a raw backend error message to Hebrew when a known mapping exists.
 * Falls back to the original message (or the English text as-is for lang === 'en').
 */
export function translateApiErrorMessage(message: string | undefined | null, lang: 'he' | 'en'): string {
  if (!message) {
    return message ?? '';
  }

  if (lang !== 'he') {
    return message;
  }

  const exact = EXACT_TRANSLATIONS_HE[message];
  if (exact) {
    return exact;
  }

  for (const pattern of PATTERN_TRANSLATIONS_HE) {
    const match = message.match(pattern.regex);
    if (match) {
      return pattern.translate(...match.slice(1));
    }
  }

  return message;
}
