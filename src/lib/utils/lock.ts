const LOCK_HOUR = 22; // 10 PM

/** Returns today's date as YYYY-MM-DD in the user's local timezone. */
export function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns true if the dashboard should be locked:
 * - Current local time is >= 10 PM, AND
 * - lastReflectionDate is before today (or null)
 */
export function shouldLock(lastReflectionDate: string | null): boolean {
  const now = new Date();
  if (now.getHours() < LOCK_HOUR) return false;
  if (!lastReflectionDate) return true;
  return lastReflectionDate < getLocalDateString();
}
