export function sortByHebrewName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'he'));
}

export function sortByOrderIndex<T extends { orderIndex: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.orderIndex - b.orderIndex);
}
