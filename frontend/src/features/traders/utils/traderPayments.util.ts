export const MIN_PAYMENT_PERCENT = 0;
export const MAX_PAYMENT_PERCENT = 100;

export const isValidPaymentPercent = (value: string): boolean => {
  if (value.trim() === '') {
    return false;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) && parsedValue >= MIN_PAYMENT_PERCENT && parsedValue <= MAX_PAYMENT_PERCENT;
};
