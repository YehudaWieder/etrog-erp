import { BadRequestException } from '@nestjs/common';

// Smallest total that splits into whole units for every share (e.g. 5 for 40/40/20).
export function calculateShareStep(sharePercents: string[]): bigint {
  const hundred = 100n;

  let step = 1n;
  for (const percentText of sharePercents) {
    const fraction = decimalToFraction(percentText);
    if (fraction.numerator <= 0n) {
      throw new BadRequestException('All trader shares must be positive numbers');
    }

    const denominator = hundred * fraction.denominator;
    const unitStep = denominator / gcd(fraction.numerator, denominator);
    step = lcm(step, unitStep);
  }

  return step;
}

export function calculateMinimalGrossByShares(deficit: number, sharePercents: string[]) {
  const deficitBig = BigInt(deficit);
  const step = calculateShareStep(sharePercents);

  const gross = ((deficitBig + step - 1n) / step) * step;
  if (gross > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new BadRequestException('Calculated gross quantity is too large');
  }

  return Number(gross);
}

// Largest total ≤ quantity that still splits into whole units for every share (e.g. for
// quantity=9 and shares 40/40/20, the step is 5, so this returns 5 rather than rounding up to 10).
// Whatever is left over (quantity - result) does not divide fairly and must stay undistributed.
export function calculateMaximalDistributableByShares(quantity: number, sharePercents: string[]) {
  const quantityBig = BigInt(quantity);
  const step = calculateShareStep(sharePercents);

  const distributable = (quantityBig / step) * step;
  return Number(distributable);
}

export function calculateExactShareQuantity(total: number, percentText: string) {
  const totalBig = BigInt(total);
  const fraction = decimalToFraction(percentText);
  const numerator = totalBig * fraction.numerator;
  const denominator = 100n * fraction.denominator;

  if (numerator % denominator !== 0n) {
    throw new BadRequestException('Share distribution produced non-integer quantity');
  }

  const value = numerator / denominator;
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new BadRequestException('Calculated share quantity is too large');
  }

  return Number(value);
}

function decimalToFraction(value: string) {
  const normalized = value.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new BadRequestException(`Invalid share percent value: ${value}`);
  }

  const parts = normalized.split('.');
  if (parts.length === 1) {
    return { numerator: BigInt(parts[0]), denominator: 1n };
  }

  const whole = parts[0];
  const frac = parts[1];
  const denominator = 10n ** BigInt(frac.length);
  const numerator = BigInt(whole + frac);
  const divisor = gcd(numerator, denominator);

  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  };
}

function gcd(a: bigint, b: bigint): bigint {
  let left = a < 0n ? -a : a;
  let right = b < 0n ? -b : b;

  while (right !== 0n) {
    const temp = left % right;
    left = right;
    right = temp;
  }

  return left;
}

function lcm(a: bigint, b: bigint): bigint {
  if (a === 0n || b === 0n) {
    return 0n;
  }

  return (a / gcd(a, b)) * b;
}
