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
  'Delete classification': 'מחיקת מיון',
  'Update classification quantity': 'עדכון כמות מיון',
  'Customer stock transfer to general pool': 'העברת מלאי לקוח למאגר הכללי',
  'Withdrawal from remains in Italy': 'הוצאה מנשאר באיטליה',
  'Cancel withdrawal from remains in Italy': 'ביטול הוצאה מנשאר באיטליה',
  'Reclassification and reassignment': 'שינוי סיווג ושיוך',
  'Reclassification and reassignment from remains in Italy': 'שינוי סיווג ושיוך מנשאר באיטליה',
  'General reclassification and reassignment': 'שינוי סיווג ושיוך כללי',
  'Cancel reclassification and reassignment': 'ביטול שינוי סיווג ושיוך',
  'General waste': 'פחת כללי',
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
  'toPitamStatus cannot be MIXED': 'לא ניתן לבחור "מעורב" כסטטוס פיטם עבור הלקוח - יש לבחור עם פיטם או בלי פיטם',
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
  'Cannot delete harvest record because it has related sortings. Delete all sortings first.':
    'לא ניתן למחוק רשומת קטיף שיש לה מיונים מקושרים. יש למחוק את כל המיונים תחילה.',
  'Cannot delete harvest record because related records exist in the system.':
    'לא ניתן למחוק את רשומת הקטיף כי קיימות רשומות מקושרות במערכת.',
  'Ledger mismatch while updating transfer operation': 'חוסר התאמה בנתוני ההעברה בעת העדכון',
  'Cannot delete item from a shipped or delivered box': 'לא ניתן למחוק פריט מקרטון שסומן כנשלח או נמסר',
  'Cannot edit item from a shipped or delivered box': 'לא ניתן לערוך פריט שנמצא בקרטון שנשלח או נמסר',
  'Destination trader has no share configured for the requested category.':
    'לסוחר היעד אין הגדרת אחוזים בקטגוריה המבוקשת.',
  'The new classification is identical to the old one - no change to make.':
    'הסיווג החדש זהה לסיווג הישן - אין שינוי לבצע.',
  'Trader category and grade must be selected.': 'יש לבחור קטגוריית סוחר ודרגה.',
  'A trader must be selected when the source is "specific trader".': 'יש לבחור סוחר כאשר המקור הוא "סוחר ספציפי".',
  'A source must be selected: specific trader, modulo, or general.': 'יש לבחור מקור: סוחר ספציפי, מודולו או כללי.',
  'No percentage split between traders is defined for this category in the current season.':
    'לא הוגדרה חלוקת אחוזים בין סוחרים עבור קטגוריה זו בעונה הנוכחית.',
  'All percentages defined for traders in this category are zero or negative.':
    'כל האחוזים המוגדרים לסוחרים בקטגוריה זו הם אפס או שליליים.',
  'The "with pitam" and "without pitam" quantities must be positive integers.':
    'הכמויות "עם פיטם" ו"בלי פיטם" חייבות להיות מספרים שלמים וחיוביים.',
  'The sum of the "with pitam" and "without pitam" quantities must be greater than zero.':
    'סכום הכמויות "עם פיטם" ו"בלי פיטם" חייב להיות גדול מאפס.',
  'A general waste movement split across multiple traders cannot be edited — delete and re-enter it instead.':
    'תנועת פחת כללי מפוצלת בין מספר סוחרים לא ניתנת לעריכה — יש למחוק ולהזין מחדש.',
};

type PatternTranslation = {
  regex: RegExp;
  translate: (...groups: string[]) => string;
};

// contextLabel values can carry a "(trader N)" suffix (see general-share-allocation.service.ts);
// translate the base label and re-attach the trader id in Hebrew.
const TRADER_SUFFIX_PATTERN = /^(.+) \(trader (\d+)\)$/;

function resolveContextLabel(context: string): string {
  const suffixMatch = context.match(TRADER_SUFFIX_PATTERN);
  if (suffixMatch) {
    const [, base, traderId] = suffixMatch;
    return `${CONTEXT_LABELS_HE[base] ?? base} (סוחר ${traderId})`;
  }

  return CONTEXT_LABELS_HE[context] ?? context;
}

const PATTERN_TRANSLATIONS_HE: PatternTranslation[] = [
  {
    regex: /^Total classifications quantity \((\d+)\) cannot exceed net harvested quantity \((\d+)\)/,
    translate: (classificationsTotal, netHarvested) =>
      `סה"כ כמות המיון (${classificationsTotal}) לא יכולה לעלות על כמות הנטו שנקטפה (${netHarvested}).`,
  },
  {
    regex: /^Total classifications quantity \((\d+)\) must equal net harvested quantity \((\d+)\) in FINAL mode/,
    translate: (classificationsTotal, netHarvested) =>
      `סה"כ כמות המיון (${classificationsTotal}) חייבת להיות שווה לכמות הנטו שנקטפה (${netHarvested}) במצב סופי.`,
  },
  {
    regex: /^Total classifications quantity \((\d+)\) must equal net harvested quantity \((\d+)\)$/,
    translate: (classificationsTotal, netHarvested) =>
      `סה"כ כמות המיון (${classificationsTotal}) חייבת להיות שווה לכמות הנטו שנקטפה (${netHarvested}) במיון מלא.`,
  },
  {
    regex: /^Duplicate classification found/,
    translate: () =>
      'רשומת מיון כפולה: כל שילוב של סוג, סוחר/לקוח, קטגוריה ודרגה חייב להיות ייחודי.',
  },
  {
    regex: /^(.+?): insufficient unshipped trader stock\. Required=([\d.]+), available=([\d.]+)$/,
    translate: (context, required, available) =>
      `${resolveContextLabel(context)}: אין מספיק מלאי זמין לסוחר. נדרש: ${required}, קיים: ${available}`,
  },
  {
    regex: /^(.+?): insufficient unshipped customer stock\. Required=([\d.]+), available=([\d.]+)$/,
    translate: (context, required, available) =>
      `${resolveContextLabel(context)}: אין מספיק מלאי זמין ללקוח. נדרש: ${required}, קיים: ${available}`,
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
  {
    regex: /^Withdrawal from remains in Italy \((\d+)\) not found\.$/,
    translate: (anchorId) => `הוצאה מנשאר באיטליה (${anchorId}) לא נמצאה.`,
  },
  {
    regex: /^Reclassification and reassignment \((\d+)\) not found\.$/,
    translate: (anchorId) => `שינוי סיווג ושיוך (${anchorId}) לא נמצא.`,
  },
  {
    regex: /^Requested pitam split batch \((.+)\) not found\.$/,
    translate: (batchId) => `פעולת הסיווג המבוקשת (${batchId}) לא נמצאה.`,
  },
  {
    regex: /^Cannot classify (\d+) units as "general": only (\d+) units can be fairly split between traders \(based on each trader's actual balance\), and the remaining (\d+) were expected to come from modulo — but modulo only has (\d+) mixed units\. You can request a smaller quantity, or classify the difference from a specific source \(trader\/modulo\)\.$/,
    translate: (totalQty, traderPortion, moduloRemainder, moduloAvailable) =>
      `לא ניתן לסווג ${totalQty} יחידות כ"כללי": רק ${traderPortion} יחידות ניתנות לחלוקה הוגנת בין הסוחרים (לפי היתרה בפועל של כל סוחר), ` +
      `וה-${moduloRemainder} הנותרות אמורות להגיע מהמודולו — אך במודולו יש רק ${moduloAvailable} יחידות מעורב. ` +
      `אפשר לבקש כמות קטנה יותר, או לסווג את ההפרש ממקור ספציפי (סוחר/מודולו).`,
  },
  {
    regex: /^Cannot classify (\d+) units as "general": the quantity does not split fairly between traders \(a multiple of (\d+) is required\), and modulo only has (\d+) out of the (\d+) needed\. You can request a multiple of (\d+) units for a fair split, or classify from a specific source \(trader\/modulo\)\.$/,
    translate: (totalQty, fairStep, moduloAvailable, moduloRemainder) =>
      `לא ניתן לסווג ${totalQty} יחידות כ"כללי": הכמות אינה מתחלקת בצורה הוגנת בין הסוחרים (נדרשת כמות שהיא כפולה של ${fairStep}), ` +
      `ובמודולו יש רק ${moduloAvailable} מתוך ${moduloRemainder} הדרושות. ` +
      `אפשר לבקש כפולה של ${fairStep} יחידות לחלוקה הוגנת, או לסווג ממקור ספציפי (סוחר/מודולו).`,
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
