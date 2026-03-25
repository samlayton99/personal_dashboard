"use client";

import { useEffect } from "react";
import { createClient } from "./client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type PostgresChangeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface UseRealtimeOptions {
  table: string;
  event?: PostgresChangeEvent;
  schema?: string;
  onPayload: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
}

export function useRealtime({ table, event = "*", schema = "public", onPayload }: UseRealtimeOptions) {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        "postgres_changes",
        { event, schema, table },
        onPayload
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, schema, onPayload]);
}
