import { LOCK_HOUR } from "@/lib/constants";

/** Returns today's date as YYYY-MM-DD in the user's local timezone. */
export function getLocalDateString(): string {
  const now = new Date();
  return formatLocalDate(now);
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns the date to store as last_reflection_date when unlocking.
 *
 * If unlocking BEFORE 10 PM, this is a catch-up — return yesterday so
 * tonight's 10 PM lock still fires.
 * If unlocking AT or AFTER 10 PM, this is tonight's reflection — return today.
 */
export function getEffectiveReflectionDate(): string {
  const now = new Date();
  if (now.getHours() >= LOCK_HOUR) {
    return formatLocalDate(now);
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return formatLocalDate(yesterday);
}

/**
 * Returns true if the lock should be TRIGGERED for the first time today:
 * - Current local time is >= 10 PM, AND
 * - lastReflectionDate is before today (or null)
 *
 * This is only for deciding when to initially set is_locked=true.
 * Once locked, the lock persists indefinitely until the reflection
 * flow explicitly unlocks it — this function is NOT consulted for that.
 */
export function shouldTriggerLock(lastReflectionDate: string | null): boolean {
  const now = new Date();
  if (now.getHours() < LOCK_HOUR) return false;
  if (!lastReflectionDate) return true;
  return lastReflectionDate < getLocalDateString();
}
