let counter = 0;

export function createTempId(prefix?: string): string {
  const id = `${Date.now()}_${counter++}`;
  return prefix ? `temp_${prefix}_${id}` : `temp_${id}`;
}

export function isTempId(id: string): boolean {
  return id.startsWith("temp_");
}
