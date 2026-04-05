import { LOCK_HOUR } from "@/lib/constants";

/**
 * Returns the most recent 10 PM boundary as an ISO string.
 * If it's currently 11 PM Tuesday → Tuesday 10 PM.
 * If it's currently 3 PM Tuesday → Monday 10 PM.
 */
export function getLastLockBoundary(): string {
  const now = new Date();
  const boundary = new Date(now);
  boundary.setHours(LOCK_HOUR, 0, 0, 0);
  if (now < boundary) {
    boundary.setDate(boundary.getDate() - 1);
  }
  return boundary.toISOString();
}

/** Returns today's date as YYYY-MM-DD in the user's local timezone. */
export function getLocalDateString(): string {
  const now = new Date();
  return formatLocalDate(now);
}

export function formatLocalDate(date: Date): string {
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
 * Returns true if the lock should be TRIGGERED for the first time today.
 *
 * Two cases:
 * 1. Catch-up: if lastReflectionDate is more than 1 day behind today (i.e. a
 *    whole night was missed — dashboard wasn't open at 10 PM), trigger the
 *    lock on next page load regardless of current hour.
 * 2. Normal: on the same day the reflection is due, only trigger after 10 PM.
 *
 * This is only for deciding when to initially set is_locked=true. Once locked,
 * the lock persists indefinitely until the reflection flow explicitly unlocks
 * it — this function is NOT consulted for that.
 */
export function shouldTriggerLock(lastReflectionDate: string | null): boolean {
  if (!lastReflectionDate) return true;

  const today = getLocalDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  // Missed a full night — lock immediately, any hour
  if (lastReflectionDate < formatLocalDate(yesterday)) return true;

  // Same-day case: only after 10 PM
  const now = new Date();
  if (now.getHours() < LOCK_HOUR) return false;
  return lastReflectionDate < today;
}
