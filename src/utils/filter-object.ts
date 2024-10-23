// Utility function to filter any object
export function filterObject<T extends Record<string, any>>(
  obj: T,
  include?: string[],
  exclude?: string[]
): Partial<T> {
  // Handle edge cases
  if (!obj || typeof obj !== "object") {
    return {};
  }

  // Convert mongoose document to plain object if needed
  const sourceObj = obj.toObject ? obj.toObject() : obj;

  // If neither include nor exclude is provided, return a copy of the original object
  if (!include && !exclude) {
    return { ...sourceObj };
  }

  // If include array is provided, only keep those properties
  if (include?.length) {
    const filtered: Partial<T> = {};
    include.forEach((key) => {
      if (key in sourceObj) {
        filtered[key as keyof T] = sourceObj[key];
      }
    });
    return filtered;
  }

  // If exclude array is provided, remove those properties
  if (exclude?.length) {
    const filtered: Partial<T> = { ...sourceObj };
    exclude.forEach((key) => {
      delete filtered[key as keyof T];
    });
    return filtered;
  }

  // Return empty object if arrays are empty
  return {};
}
