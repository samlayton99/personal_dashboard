import { createClient } from "@/lib/supabase/server";
import { HistoryPageClient } from "./client";

export default async function HistoryPage() {
  const supabase = await createClient();

  const [objRes, pushRes, actionRes, meetingsRes, groupsRes] = await Promise.all([
    supabase
      .from("objectives")
      .select("*")
      .eq("status", "inactive")
      .order("updated_at", { ascending: false }),
    supabase
      .from("pushes")
      .select("*")
      .eq("status", "inactive")
      .order("updated_at", { ascending: false }),
    supabase
      .from("actions")
      .select("*")
      .order("date", { ascending: false })
      .limit(100),
    supabase
      .from("network_meetings")
      .select("*")
      .order("met_at", { ascending: false }),
    supabase
      .from("network_groups")
      .select("id, name")
      .order("name"),
  ]);

  return (
    <HistoryPageClient
      objectives={objRes.data ?? []}
      pushes={pushRes.data ?? []}
      actions={actionRes.data ?? []}
      meetings={meetingsRes.data ?? []}
      groupNames={(groupsRes.data ?? []).map((g) => g.name)}
    />
  );
}
