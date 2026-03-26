import { cache } from "react";
import { createClient } from "./server";

export const getSystemState = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("system_state")
    .select("*")
    .eq("id", 1)
    .single();
  return data;
});
