import { Currency } from '@prisma/client';

export interface SetTraderSeasonSettingsDto {
  seasonId: number;
  traderId: number;
  paymentPercent: number;
  pricePerEtrog: number;
  currency?: Currency;
}
