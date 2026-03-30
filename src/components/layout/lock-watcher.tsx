"use client";

import { useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/lib/supabase/use-realtime";
import { shouldTriggerLock } from "@/lib/utils/lock";

interface LockWatcherProps {
  initialIsLocked: boolean;
  initialLastReflectionDate: string | null;
}

/**
 * Runs in the dashboard layout so it's active on every page.
 *
 * Two responsibilities:
 * 1. TRIGGER: At 10 PM, write is_locked=true if no reflection done today.
 * 2. ENFORCE: If DB says is_locked=true (for ANY reason, at ANY time),
 *    redirect to /first-principles. The lock persists indefinitely until
 *    the reflection flow or the unlock script explicitly sets is_locked=false.
 */
export function LockWatcher({
  initialIsLocked,
  initialLastReflectionDate,
}: LockWatcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isLockedRef = useRef(initialIsLocked);
  const lastReflectionDateRef = useRef(initialLastReflectionDate);

  // Redirect to first-principles if locked and on another page
  const enforceRedirect = useCallback(() => {
    if (isLockedRef.current && !pathname.startsWith("/first-principles")) {
      router.push("/first-principles");
    }
  }, [pathname, router]);

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

  // On mount: verify lock state directly from DB (don't trust server cache)
  useEffect(() => {
    async function verifyLockState() {
      const supabase = createClient();
      const { data } = await supabase
        .from("system_state")
        .select("is_locked, last_reflection_date")
        .eq("id", 1)
        .single();

      if (data) {
        isLockedRef.current = data.is_locked;
        lastReflectionDateRef.current = data.last_reflection_date;
        if (data.is_locked && !window.location.pathname.startsWith("/first-principles")) {
          router.push("/first-principles");
        }
      }
    }

    verifyLockState();
  }, [router]);

  // Poll every 30 seconds for two things:
  // 1. Should we trigger a new lock (time-based)?
  // 2. Is the DB locked (catch any missed realtime updates)?
  useEffect(() => {
    async function checkLock() {
      const supabase = createClient();

      // If not currently locked, check if we should trigger
      if (!isLockedRef.current) {
        if (shouldTriggerLock(lastReflectionDateRef.current)) {
          // Time to lock -- write to DB
          await supabase
            .from("system_state")
            .update({ is_locked: true, locked_at: new Date().toISOString() })
            .eq("id", 1);

          isLockedRef.current = true;
          router.push("/first-principles");
          return;
        }

        // Also re-check DB in case lock was set externally (edge function, script)
        const { data } = await supabase
          .from("system_state")
          .select("is_locked, last_reflection_date")
          .eq("id", 1)
          .single();

        if (data?.is_locked) {
          isLockedRef.current = true;
          lastReflectionDateRef.current = data.last_reflection_date;
          router.push("/first-principles");
        }
        return;
      }

      // Already locked -- just enforce redirect
      if (!window.location.pathname.startsWith("/first-principles")) {
        router.push("/first-principles");
      }
    }

    // Check immediately on mount
    checkLock();

    const interval = setInterval(checkLock, 30_000);
    return () => clearInterval(interval);
  }, [router]);

  // Enforce redirect whenever pathname changes while locked
  useEffect(() => {
    enforceRedirect();
  }, [enforceRedirect]);

  return null;
}
