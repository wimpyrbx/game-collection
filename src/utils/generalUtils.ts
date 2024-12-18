// Utility function to sort an array of objects by a specified key
export function sortByKey<T>(array: T[], key: keyof T): T[] {
  return array.slice().sort((a, b) => {
    const aValue = a[key] as unknown as string;
    const bValue = b[key] as unknown as string;
    return aValue.localeCompare(bValue);
  });
} 