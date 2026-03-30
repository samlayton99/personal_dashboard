import { cache } from "react";
import { createServerSupabaseClient } from "./server";

export const getSystemState = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("system_state")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) throw new Error(`Failed to fetch system state: ${error.message}`);
  return data;
});
