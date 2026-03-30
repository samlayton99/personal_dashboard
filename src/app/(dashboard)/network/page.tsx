import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NetworkPanel } from "@/components/network/network-panel";

export const dynamic = "force-dynamic";

export default async function NetworkPage() {
  const supabase = await createServerSupabaseClient();

  const [groupsRes, contactsRes, meetingsRes] = await Promise.all([
    supabase.from("network_groups").select("*").order("sort_order"),
    supabase.from("network_contacts").select("*").order("sort_order"),
    supabase
      .from("network_meetings")
      .select("*")
      .order("met_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <NetworkPanel
      initialGroups={groupsRes.data ?? []}
      initialContacts={contactsRes.data ?? []}
      initialMeetings={meetingsRes.data ?? []}
    />
  );
}
