import { Currency, Grade } from '@prisma/client';

export interface SetCustomerCategoryPriceDto {
  seasonId: number;
  customerId: number;
  name: string;
  grade: Grade;
  price?: number;
  currency?: Currency;
}
