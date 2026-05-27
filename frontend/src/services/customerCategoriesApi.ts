import { apiClient } from './apiClient';

export type Grade = string;
export type Currency = 'ILS' | 'USD' | 'EUR';

export type CustomerCategory = {
  id: number;
  seasonId: number;
  customerId: number;
  name: string;
  grade: Grade;
  price: number | string;
  currency: Currency;
  customer?: {
    customerName: string;
  } | null;
};

export type CreateCustomerCategoryPayload = {
  seasonId: number;
  customerId: number;
  name: string;
  grade: Grade;
  price: number;
  currency: Currency;
};

export type UpdateCustomerCategoryPayload = {
  id: number;
  seasonId?: number;
  customerId?: number;
  name?: string;
  grade?: Grade;
  price?: number;
  currency?: Currency;
};

export async function getCustomerCategoriesBySeason(seasonId: number): Promise<CustomerCategory[]> {
  return apiClient<CustomerCategory[]>(`/customer-categories?seasonId=${seasonId}`);
}

export async function createCustomerCategory(payload: CreateCustomerCategoryPayload): Promise<CustomerCategory> {
  return apiClient<CustomerCategory>('/customer-categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCustomerCategory(payload: UpdateCustomerCategoryPayload): Promise<CustomerCategory> {
  return apiClient<CustomerCategory>('/customer-categories', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteCustomerCategory(id: number): Promise<CustomerCategory> {
  return apiClient<CustomerCategory>(`/customer-categories/${id}`, {
    method: 'DELETE',
  });
}