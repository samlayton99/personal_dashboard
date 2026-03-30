"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { isTempId } from "@/lib/utils/temp-id";

type NetworkSection = Database["public"]["Enums"]["network_section"];

// ============================================================
// GROUPS
// ============================================================

export async function createGroup(name: string): Promise<string> {
  const supabase = await createServerSupabaseClient();

  const { data: maxOrder } = await supabase
    .from("network_groups")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from("network_groups")
    .insert({
      name,
      sort_order: (maxOrder?.sort_order ?? -1) + 1,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateGroup(id: string, name: string) {
  if (isTempId(id)) return;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("network_groups")
    .update({ name })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteGroup(id: string) {
  if (isTempId(id)) return;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("network_groups")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderGroups(orderedIds: string[]) {
  const realIds = orderedIds.filter((id) => !isTempId(id));
  if (realIds.length === 0) return;
  const supabase = await createServerSupabaseClient();
  const updates = realIds.map((id, index) =>
    supabase.from("network_groups").update({ sort_order: index }).eq("id", id)
  );
  await Promise.all(updates);
}

// ============================================================
// CONTACTS
// ============================================================

export async function createContact(data: {
  group_id: string;
  name: string;
  section: NetworkSection;
}): Promise<string> {
  const supabase = await createServerSupabaseClient();

  const { data: maxOrder } = await supabase
    .from("network_contacts")
    .select("sort_order")
    .eq("group_id", data.group_id)
    .eq("section", data.section)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const { data: contact, error } = await supabase
    .from("network_contacts")
    .insert({
      group_id: data.group_id,
      name: data.name,
      section: data.section,
      sort_order: (maxOrder?.sort_order ?? -1) + 1,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return contact.id;
}

export async function deleteContact(id: string) {
  if (isTempId(id)) return;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("network_contacts")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderContacts(
  updates: { id: string; section: NetworkSection; sort_order: number }[]
) {
  const realUpdates = updates.filter((u) => !isTempId(u.id));
  if (realUpdates.length === 0) return;
  const supabase = await createServerSupabaseClient();
  const ops = realUpdates.map((u) =>
    supabase
      .from("network_contacts")
      .update({ section: u.section, sort_order: u.sort_order })
      .eq("id", u.id)
  );
  await Promise.all(ops);
}

// ============================================================
// MEETINGS (Met With)
// ============================================================

export async function deleteMeeting(id: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("network_meetings")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteMeetings(ids: string[]) {
  if (ids.length === 0) return;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("network_meetings")
    .delete()
    .in("id", ids);
  if (error) throw new Error(error.message);
}

export async function markMetWith(id: string, notes?: string) {
  if (isTempId(id)) return;
  const supabase = await createServerSupabaseClient();

  const { data: contact, error: fetchError } = await supabase
    .from("network_contacts")
    .select("name, group_id, section")
    .eq("id", id)
    .single();

  if (fetchError || !contact) throw new Error(fetchError?.message ?? "Contact not found");

  const { data: group } = await supabase
    .from("network_groups")
    .select("name")
    .eq("id", contact.group_id)
    .single();

  const { error: meetingError } = await supabase.from("network_meetings").insert({
    contact_name: contact.name,
    group_name: group?.name ?? "Unknown",
    group_id: contact.group_id,
    section_at_meeting: contact.section,
    notes: notes || null,
  });

  if (meetingError) throw new Error(meetingError.message);

  const { error: deleteError } = await supabase
    .from("network_contacts")
    .delete()
    .eq("id", id);

  if (deleteError) throw new Error(deleteError.message);
}
