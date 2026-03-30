import { cache } from "react";
import { createClient } from "./server";

export const getSystemState = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("system_state")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) throw new Error(`Failed to fetch system state: ${error.message}`);
  return data;
});
