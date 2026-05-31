type CustomerLike = {
  customerName: string;
};

export function sortCustomersByName<T extends CustomerLike>(customers: T[]): T[] {
  return [...customers].sort((a, b) => a.customerName.localeCompare(b.customerName, 'he'));
}
