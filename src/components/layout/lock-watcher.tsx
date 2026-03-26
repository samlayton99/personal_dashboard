"use client";

import { useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/lib/supabase/use-realtime";
import { shouldLock } from "@/lib/utils/lock";

interface LockWatcherProps {
  initialIsLocked: boolean;
  initialLastReflectionDate: string | null;
}

/**
 * Runs in the dashboard layout so it's active on every page.
 * Detects when the lock should trigger (10 PM crossing) and
 * writes is_locked=true to the DB, then redirects to /first-principles.
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

  // Check every 30 seconds if we should lock
  useEffect(() => {
    async function checkAndLock() {
      if (isLockedRef.current) return;
      if (!shouldLock(lastReflectionDateRef.current)) return;

      // Time to lock -- write to DB
      const supabase = createClient();
      await supabase
        .from("system_state")
        .update({ is_locked: true, locked_at: new Date().toISOString() })
        .eq("id", 1);

      isLockedRef.current = true;
      router.push("/first-principles");
    }

    // Check immediately on mount
    checkAndLock();

    const interval = setInterval(checkAndLock, 30_000);
    return () => clearInterval(interval);
  }, [router]);

  // Enforce redirect whenever pathname changes while locked
  useEffect(() => {
    enforceRedirect();
  }, [enforceRedirect]);

  return null;
}
