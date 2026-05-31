type FieldLike = {
  name: string;
};

export function sortFieldsByName<T extends FieldLike>(fields: T[]): T[] {
  return [...fields].sort((a, b) => a.name.localeCompare(b.name, 'he'));
}
