const hebrewCalendarFormatter = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function formatHebrewNumber(value: number): string {
  const normalizedValue = value >= 5000 ? value % 1000 : value;

  if (normalizedValue <= 0) {
    return String(value);
  }

  const parts: string[] = [];
  let remaining = normalizedValue;

  while (remaining >= 400) {
    parts.push('ת');
    remaining -= 400;
  }

  const hundreds = [
    { value: 300, symbol: 'ש' },
    { value: 200, symbol: 'ר' },
    { value: 100, symbol: 'ק' },
  ];

  for (const { value: partValue, symbol } of hundreds) {
    if (remaining >= partValue) {
      parts.push(symbol);
      remaining -= partValue;
    }
  }

  if (remaining === 15) {
    parts.push('טו');
    remaining = 0;
  } else if (remaining === 16) {
    parts.push('טז');
    remaining = 0;
  }

  const tens = [
    { value: 90, symbol: 'צ' },
    { value: 80, symbol: 'פ' },
    { value: 70, symbol: 'ע' },
    { value: 60, symbol: 'ס' },
    { value: 50, symbol: 'נ' },
    { value: 40, symbol: 'מ' },
    { value: 30, symbol: 'ל' },
    { value: 20, symbol: 'כ' },
    { value: 10, symbol: 'י' },
  ];

  for (const { value: partValue, symbol } of tens) {
    if (remaining >= partValue) {
      parts.push(symbol);
      remaining -= partValue;
    }
  }

  const ones = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];

  if (remaining > 0) {
    parts.push(ones[remaining - 1]);
  }

  return parts.join('');
}

export function formatGregorianDate(value: Date): string {
  const day = String(value.getDate()).padStart(2, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const year = value.getFullYear();

  return `${day}/${month}/${year}`;
}

export function formatHebrewDate(value: Date): string {
  const parts = hebrewCalendarFormatter.formatToParts(value);
  const dayPart = parts.find((part) => part.type === 'day')?.value;
  const monthPart = parts.find((part) => part.type === 'month')?.value;
  const yearPart = parts.find((part) => part.type === 'year')?.value;

  const dayNumber = dayPart ? Number(dayPart.replace(/\D/g, '')) : NaN;
  const yearNumber = yearPart ? Number(yearPart.replace(/\D/g, '')) : NaN;

  if (!monthPart || Number.isNaN(dayNumber) || Number.isNaN(yearNumber)) {
    return hebrewCalendarFormatter.format(value);
  }

  return `${formatHebrewNumber(dayNumber)} ${monthPart} ${formatHebrewNumber(yearNumber)}`;
}