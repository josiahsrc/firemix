export function chunkify<T>(values: T[], size: number): T[][] {
  const chunks = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}

export type Nullable<T> = T | null;
