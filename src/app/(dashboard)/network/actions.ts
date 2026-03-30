"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type NetworkSection = Database["public"]["Enums"]["network_section"];

// ============================================================
// GROUPS
// ============================================================

export async function createGroup(name: string): Promise<string> {
  const supabase = await createClient();

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
  if (id.startsWith("temp_")) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("network_groups")
    .update({ name })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteGroup(id: string) {
  if (id.startsWith("temp_")) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("network_groups")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================
// CONTACTS
// ============================================================

export async function createContact(data: {
  group_id: string;
  name: string;
  section: NetworkSection;
}): Promise<string> {
  const supabase = await createClient();

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
  if (id.startsWith("temp_")) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("network_contacts")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderContacts(
  updates: { id: string; section: NetworkSection; sort_order: number }[]
) {
  const realUpdates = updates.filter((u) => !u.id.startsWith("temp_"));
  if (realUpdates.length === 0) return;
  const supabase = await createClient();
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

export async function markMetWith(id: string, notes?: string) {
  if (id.startsWith("temp_")) return;
  const supabase = await createClient();

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
