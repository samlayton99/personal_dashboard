"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useRealtime } from "@/lib/supabase/use-realtime";
import { shouldTriggerLock } from "@/lib/utils/lock";
import { LOCK_HOUR } from "@/lib/constants";

interface LockWatcherProps {
  initialIsLocked: boolean;
  initialLastReflectionDate: string | null;
}

/**
 * Runs in the dashboard layout so it's active on every page.
 *
 * Two responsibilities:
 * 1. TRIGGER: At 10 PM (or on mount if catch-up is needed), write
 *    is_locked=true if no reflection done today.
 * 2. ENFORCE: If DB says is_locked=true (for ANY reason, at ANY time),
 *    redirect to /first-principles. The lock persists indefinitely until
 *    the reflection flow explicitly sets is_locked=false.
 *
 * Middleware is the server-side hard gate (redirects on every navigation).
 * This component handles the client-side: realtime reaction + time-based trigger.
 */
export function LockWatcher({
  initialIsLocked,
  initialLastReflectionDate,
}: LockWatcherProps) {
  const router = useRouter();
  const isLockedRef = useRef(initialIsLocked);
  const lastReflectionDateRef = useRef(initialLastReflectionDate);

  // Listen for realtime system_state changes
  useRealtime({
    table: "system_state",
    event: "UPDATE",
    onPayload: useCallback(
      (payload: { new: Record<string, unknown> }) => {
        const newState = payload.new as {
          is_locked: boolean;
          last_reflection_date: string | null;
        };
        isLockedRef.current = newState.is_locked;
        lastReflectionDateRef.current = newState.last_reflection_date;
        if (newState.is_locked) {
          router.push("/first-principles");
        }
      },
      [router]
    ),
  });

  // Mount check + scheduled 10 PM trigger.
  // - On mount: handles catch-up for missed nights (shouldTriggerLock checks
  //   if lastReflectionDate is >1 day stale and returns true regardless of hour).
  // - setTimeout at 10 PM: handles the normal nightly lock trigger.
  useEffect(() => {
    async function triggerLockIfNeeded() {
      if (isLockedRef.current) return;

      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from("system_state")
        .select("is_locked, last_reflection_date")
        .eq("id", 1)
        .single();

      if (!data) return;

      // Sync refs from DB
      isLockedRef.current = data.is_locked;
      lastReflectionDateRef.current = data.last_reflection_date;

      // Already locked (e.g. by another tab or edge function)
      if (data.is_locked) {
        if (!window.location.pathname.startsWith("/first-principles")) {
          router.push("/first-principles");
        }
        return;
      }

      // Check if we should trigger a new lock
      if (shouldTriggerLock(data.last_reflection_date)) {
        await supabase
          .from("system_state")
          .update({ is_locked: true, locked_at: new Date().toISOString() })
          .eq("id", 1);
        isLockedRef.current = true;
        router.push("/first-principles");
      }
    }

    // 1. Check immediately on mount (handles catch-up for missed nights)
    triggerLockIfNeeded();

    // 2. Schedule a check at 10 PM tonight
    const now = new Date();
    const tonight = new Date(now);
    tonight.setHours(LOCK_HOUR, 0, 0, 0);

    if (now < tonight) {
      const timer = setTimeout(triggerLockIfNeeded, tonight.getTime() - now.getTime());
      return () => clearTimeout(timer);
    }
    // If already past 10 PM, the mount check above handles it
  }, [router]);

  return null;
}
