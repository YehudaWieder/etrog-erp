import { apiClient } from './apiClient';

export type Customer = {
  id: number;
  customerName: string;
  email?: string | null;
  phone?: string | null;
  slug?: string;
};

export type CreateCustomerPayload = {
  customerName: string;
  email?: string;
  phone?: string;
};

export type UpdateCustomerPayload = {
  id: number;
  customerName?: string;
  email?: string;
  phone?: string;
};

export async function getCustomers(): Promise<Customer[]> {
  return apiClient<Customer[]>('/customers');
}

export async function createCustomer(customerData: CreateCustomerPayload): Promise<Customer> {
  return apiClient<Customer>('/customers', {
    method: 'POST',
    body: JSON.stringify(customerData),
  });
}

export async function updateCustomer(customerData: UpdateCustomerPayload): Promise<Customer> {
  return apiClient<Customer>('/customers', {
    method: 'PATCH',
    body: JSON.stringify(customerData),
  });
}

export async function deleteCustomer(customerId: number): Promise<Customer> {
  return apiClient<Customer>(`/customers/${customerId}`, {
    method: 'DELETE',
  });
}
