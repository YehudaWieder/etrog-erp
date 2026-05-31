import { Currency, Grade } from '@prisma/client';

export interface UpdateCustomerCategoryDto {
  id: number;
  seasonId?: number;
  customerId?: number;
  name?: string;
  grade?: Grade;
  price?: number;
  currency?: Currency;
}
