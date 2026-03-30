/**
 * Network Feature Integration Tests
 *
 * Tests the network tables (groups, contacts, meetings) against
 * the real Supabase database using the admin client.
 *
 * Run: npx tsx src/lib/__tests__/network.test.ts
 *
 * These tests create and clean up their own data.
 * They verify: CRUD operations, FK constraints, CASCADE deletes,
 * sort ordering, section enum behavior, and the "met with" flow.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type NetworkSection = Database["public"]["Enums"]["network_section"];

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

// Track IDs for cleanup
const createdGroupIds: string[] = [];

async function cleanup() {
  for (const id of createdGroupIds) {
    await supabase.from("network_groups").delete().eq("id", id);
  }
}

// ============================================================
// 1. Group CRUD
// ============================================================

async function testGroupCrud() {
  console.log("--- Group CRUD ---");

  // Create
  const { data: group, error: createErr } = await supabase
    .from("network_groups")
    .insert({ name: "Test VCs", sort_order: 0 })
    .select()
    .single();

  assert(!createErr, `Create group: ${createErr?.message}`);
  assert(!!group, "Group returned after insert");
  assert(group!.name === "Test VCs", "Group name matches");
  assert(typeof group!.id === "string" && group!.id.length > 0, "Group has UUID id");
  createdGroupIds.push(group!.id);

  // Read
  const { data: fetched } = await supabase
    .from("network_groups")
    .select("*")
    .eq("id", group!.id)
    .single();

  assert(fetched?.name === "Test VCs", "Fetched group name matches");
  assert(fetched?.sort_order === 0, "Fetched group sort_order matches");

  // Update
  const { error: updateErr } = await supabase
    .from("network_groups")
    .update({ name: "Renamed VCs" })
    .eq("id", group!.id);

  assert(!updateErr, `Update group: ${updateErr?.message}`);

  const { data: updated } = await supabase
    .from("network_groups")
    .select("*")
    .eq("id", group!.id)
    .single();

  assert(updated?.name === "Renamed VCs", "Group name updated");
  assert(
    new Date(updated!.updated_at).getTime() >= new Date(updated!.created_at).getTime(),
    "updated_at >= created_at after update"
  );

  console.log("  Group CRUD passed");
}

// ============================================================
// 2. Contact CRUD + section enum
// ============================================================

async function testContactCrud() {
  console.log("--- Contact CRUD ---");

  // Create a group first
  const { data: group } = await supabase
    .from("network_groups")
    .insert({ name: "Contact Test Group", sort_order: 10 })
    .select()
    .single();
  createdGroupIds.push(group!.id);

  // Create contacts in each section
  const sections: NetworkSection[] = ["queue", "waiting_on", "scheduled"];
  const contactIds: string[] = [];

  for (let i = 0; i < sections.length; i++) {
    const { data: contact, error } = await supabase
      .from("network_contacts")
      .insert({
        group_id: group!.id,
        name: `Person ${i}`,
        section: sections[i],
        sort_order: i,
      })
      .select()
      .single();

    assert(!error, `Create contact in ${sections[i]}: ${error?.message}`);
    assert(contact?.section === sections[i], `Contact section is ${sections[i]}`);
    contactIds.push(contact!.id);
  }

  // Read all contacts for group
  const { data: allContacts } = await supabase
    .from("network_contacts")
    .select("*")
    .eq("group_id", group!.id)
    .order("sort_order");

  assert(allContacts?.length === 3, `Expected 3 contacts, got ${allContacts?.length}`);

  // Update section (move from queue to scheduled)
  const { error: moveErr } = await supabase
    .from("network_contacts")
    .update({ section: "scheduled" as NetworkSection, sort_order: 1 })
    .eq("id", contactIds[0]);

  assert(!moveErr, `Move contact section: ${moveErr?.message}`);

  const { data: moved } = await supabase
    .from("network_contacts")
    .select("section")
    .eq("id", contactIds[0])
    .single();

  assert(moved?.section === "scheduled", "Contact moved to scheduled");

  // Delete single contact
  const { error: delErr } = await supabase
    .from("network_contacts")
    .delete()
    .eq("id", contactIds[1]);

  assert(!delErr, `Delete contact: ${delErr?.message}`);

  const { data: remaining } = await supabase
    .from("network_contacts")
    .select("id")
    .eq("group_id", group!.id);

  assert(remaining?.length === 2, `Expected 2 remaining contacts, got ${remaining?.length}`);

  console.log("  Contact CRUD passed");
}

// ============================================================
// 3. Invalid section enum rejected
// ============================================================

async function testInvalidSection() {
  console.log("--- Invalid Section Enum ---");

  const { data: group } = await supabase
    .from("network_groups")
    .insert({ name: "Enum Test Group", sort_order: 20 })
    .select()
    .single();
  createdGroupIds.push(group!.id);

  // Attempt to insert with invalid section value
  const { error } = await supabase
    .from("network_contacts")
    .insert({
      group_id: group!.id,
      name: "Bad Section",
      section: "invalid_section" as NetworkSection,
      sort_order: 0,
    });

  assert(!!error, "Invalid section enum rejected by database");

  console.log("  Invalid section enum passed");
}

// ============================================================
// 4. CASCADE delete: deleting group removes contacts + meetings
// ============================================================

async function testCascadeDelete() {
  console.log("--- CASCADE Delete ---");

  const { data: group } = await supabase
    .from("network_groups")
    .insert({ name: "Cascade Test Group", sort_order: 30 })
    .select()
    .single();

  // Create contacts
  const { data: c1 } = await supabase
    .from("network_contacts")
    .insert({ group_id: group!.id, name: "Alice", section: "queue" as NetworkSection, sort_order: 0 })
    .select()
    .single();

  const { data: c2 } = await supabase
    .from("network_contacts")
    .insert({ group_id: group!.id, name: "Bob", section: "scheduled" as NetworkSection, sort_order: 1 })
    .select()
    .single();

  // Create a meeting record
  await supabase.from("network_meetings").insert({
    contact_name: "Alice",
    group_name: group!.name,
    group_id: group!.id,
    section_at_meeting: "queue" as NetworkSection,
    notes: "Great chat",
  });

  // Verify data exists
  const { data: contactsBefore } = await supabase
    .from("network_contacts")
    .select("id")
    .eq("group_id", group!.id);
  assert(contactsBefore?.length === 2, "2 contacts exist before cascade");

  const { data: meetingsBefore } = await supabase
    .from("network_meetings")
    .select("id")
    .eq("group_id", group!.id);
  assert(meetingsBefore?.length === 1, "1 meeting exists before cascade");

  // Delete the group
  const { error: delErr } = await supabase
    .from("network_groups")
    .delete()
    .eq("id", group!.id);

  assert(!delErr, `Delete group: ${delErr?.message}`);

  // Verify cascade
  const { data: contactsAfter } = await supabase
    .from("network_contacts")
    .select("id")
    .eq("group_id", group!.id);
  assert(contactsAfter?.length === 0, "Contacts cascaded to 0");

  const { data: meetingsAfter } = await supabase
    .from("network_meetings")
    .select("id")
    .eq("group_id", group!.id);
  assert(meetingsAfter?.length === 0, "Meetings cascaded to 0");

  // Don't add to cleanup list since already deleted
  console.log("  CASCADE delete passed");
}

// ============================================================
// 5. FK constraint: contact requires valid group_id
// ============================================================

async function testFkConstraint() {
  console.log("--- FK Constraint ---");

  const fakeGroupId = "00000000-0000-0000-0000-000000000000";
  const { error } = await supabase
    .from("network_contacts")
    .insert({
      group_id: fakeGroupId,
      name: "Orphan",
      section: "queue" as NetworkSection,
      sort_order: 0,
    });

  assert(!!error, "FK constraint rejects invalid group_id");
  assert(
    error?.message.includes("foreign key") || error?.code === "23503",
    `FK error type correct: ${error?.code}`
  );

  console.log("  FK constraint passed");
}

// ============================================================
// 6. "Met With" flow: create meeting + delete contact
// ============================================================

async function testMetWithFlow() {
  console.log("--- Met With Flow ---");

  const { data: group } = await supabase
    .from("network_groups")
    .insert({ name: "Met With Test Group", sort_order: 40 })
    .select()
    .single();
  createdGroupIds.push(group!.id);

  // Create a contact
  const { data: contact } = await supabase
    .from("network_contacts")
    .insert({
      group_id: group!.id,
      name: "Charlie",
      section: "scheduled" as NetworkSection,
      sort_order: 0,
    })
    .select()
    .single();

  // Simulate the markMetWith flow:
  // 1. Read contact data
  const { data: fetched } = await supabase
    .from("network_contacts")
    .select("name, group_id, section")
    .eq("id", contact!.id)
    .single();

  assert(fetched?.name === "Charlie", "Fetched contact for met-with");

  // 2. Insert meeting
  const { data: meeting, error: meetErr } = await supabase
    .from("network_meetings")
    .insert({
      contact_name: fetched!.name,
      group_name: group!.name,
      group_id: fetched!.group_id,
      section_at_meeting: fetched!.section,
      notes: "Discussed funding",
    })
    .select()
    .single();

  assert(!meetErr, `Insert meeting: ${meetErr?.message}`);
  assert(meeting?.contact_name === "Charlie", "Meeting contact_name denormalized");
  assert(meeting?.group_name === "Met With Test Group", "Meeting group_name denormalized");
  assert(meeting?.section_at_meeting === "scheduled", "Meeting section_at_meeting captured");
  assert(meeting?.notes === "Discussed funding", "Meeting notes stored");

  // 3. Delete the contact
  const { error: delErr } = await supabase
    .from("network_contacts")
    .delete()
    .eq("id", contact!.id);

  assert(!delErr, `Delete contact after met-with: ${delErr?.message}`);

  // 4. Verify contact gone but meeting persists
  const { data: contactAfter } = await supabase
    .from("network_contacts")
    .select("id")
    .eq("id", contact!.id);
  assert(contactAfter?.length === 0, "Contact deleted after met-with");

  const { data: meetingAfter } = await supabase
    .from("network_meetings")
    .select("*")
    .eq("id", meeting!.id)
    .single();
  assert(meetingAfter?.contact_name === "Charlie", "Meeting survives contact deletion");

  console.log("  Met with flow passed");
}

// ============================================================
// 7. "Met With" without notes
// ============================================================

async function testMetWithNoNotes() {
  console.log("--- Met With (no notes) ---");

  const { data: group } = await supabase
    .from("network_groups")
    .insert({ name: "No Notes Group", sort_order: 50 })
    .select()
    .single();
  createdGroupIds.push(group!.id);

  const { data: meeting, error } = await supabase
    .from("network_meetings")
    .insert({
      contact_name: "Dana",
      group_name: group!.name,
      group_id: group!.id,
      section_at_meeting: "queue" as NetworkSection,
      notes: null,
    })
    .select()
    .single();

  assert(!error, `Meeting without notes: ${error?.message}`);
  assert(meeting?.notes === null, "Notes is null when omitted");

  console.log("  Met with (no notes) passed");
}

// ============================================================
// 8. Sort order batch update
// ============================================================

async function testSortOrderUpdate() {
  console.log("--- Sort Order Batch Update ---");

  const { data: group } = await supabase
    .from("network_groups")
    .insert({ name: "Sort Test Group", sort_order: 60 })
    .select()
    .single();
  createdGroupIds.push(group!.id);

  // Create 3 contacts in queue
  const names = ["First", "Second", "Third"];
  const ids: string[] = [];
  for (let i = 0; i < names.length; i++) {
    const { data } = await supabase
      .from("network_contacts")
      .insert({
        group_id: group!.id,
        name: names[i],
        section: "queue" as NetworkSection,
        sort_order: i,
      })
      .select("id")
      .single();
    ids.push(data!.id);
  }

  // Reorder: Third(2), First(0), Second(1) -> new order 0, 1, 2
  const updates = [
    { id: ids[2], section: "queue" as NetworkSection, sort_order: 0 },
    { id: ids[0], section: "queue" as NetworkSection, sort_order: 1 },
    { id: ids[1], section: "queue" as NetworkSection, sort_order: 2 },
  ];

  await Promise.all(
    updates.map((u) =>
      supabase
        .from("network_contacts")
        .update({ section: u.section, sort_order: u.sort_order })
        .eq("id", u.id)
    )
  );

  // Verify order
  const { data: ordered } = await supabase
    .from("network_contacts")
    .select("id, name, sort_order")
    .eq("group_id", group!.id)
    .order("sort_order");

  assert(ordered?.[0].name === "Third", `First in order: ${ordered?.[0].name}`);
  assert(ordered?.[1].name === "First", `Second in order: ${ordered?.[1].name}`);
  assert(ordered?.[2].name === "Second", `Third in order: ${ordered?.[2].name}`);

  console.log("  Sort order batch update passed");
}

// ============================================================
// 9. Cross-section drag (move contact between sections)
// ============================================================

async function testCrossSectionMove() {
  console.log("--- Cross-Section Move ---");

  const { data: group } = await supabase
    .from("network_groups")
    .insert({ name: "Move Test Group", sort_order: 70 })
    .select()
    .single();
  createdGroupIds.push(group!.id);

  const { data: contact } = await supabase
    .from("network_contacts")
    .insert({
      group_id: group!.id,
      name: "Mover",
      section: "queue" as NetworkSection,
      sort_order: 0,
    })
    .select()
    .single();

  // Move queue -> waiting_on
  await supabase
    .from("network_contacts")
    .update({ section: "waiting_on" as NetworkSection, sort_order: 0 })
    .eq("id", contact!.id);

  const { data: moved1 } = await supabase
    .from("network_contacts")
    .select("section")
    .eq("id", contact!.id)
    .single();
  assert(moved1?.section === "waiting_on", "Moved to waiting_on");

  // Move waiting_on -> scheduled
  await supabase
    .from("network_contacts")
    .update({ section: "scheduled" as NetworkSection, sort_order: 0 })
    .eq("id", contact!.id);

  const { data: moved2 } = await supabase
    .from("network_contacts")
    .select("section")
    .eq("id", contact!.id)
    .single();
  assert(moved2?.section === "scheduled", "Moved to scheduled");

  // Move scheduled -> queue (back)
  await supabase
    .from("network_contacts")
    .update({ section: "queue" as NetworkSection, sort_order: 0 })
    .eq("id", contact!.id);

  const { data: moved3 } = await supabase
    .from("network_contacts")
    .select("section")
    .eq("id", contact!.id)
    .single();
  assert(moved3?.section === "queue", "Moved back to queue");

  console.log("  Cross-section move passed");
}

// ============================================================
// 10. Multiple groups with independent contacts
// ============================================================

async function testMultipleGroups() {
  console.log("--- Multiple Groups Independence ---");

  const { data: g1 } = await supabase
    .from("network_groups")
    .insert({ name: "Group A", sort_order: 80 })
    .select()
    .single();
  createdGroupIds.push(g1!.id);

  const { data: g2 } = await supabase
    .from("network_groups")
    .insert({ name: "Group B", sort_order: 81 })
    .select()
    .single();
  createdGroupIds.push(g2!.id);

  // Add contacts to each
  await supabase.from("network_contacts").insert([
    { group_id: g1!.id, name: "A1", section: "queue" as NetworkSection, sort_order: 0 },
    { group_id: g1!.id, name: "A2", section: "queue" as NetworkSection, sort_order: 1 },
  ]);

  await supabase.from("network_contacts").insert([
    { group_id: g2!.id, name: "B1", section: "scheduled" as NetworkSection, sort_order: 0 },
  ]);

  // Verify isolation
  const { data: g1Contacts } = await supabase
    .from("network_contacts")
    .select("name")
    .eq("group_id", g1!.id);
  assert(g1Contacts?.length === 2, `Group A has 2 contacts, got ${g1Contacts?.length}`);

  const { data: g2Contacts } = await supabase
    .from("network_contacts")
    .select("name")
    .eq("group_id", g2!.id);
  assert(g2Contacts?.length === 1, `Group B has 1 contact, got ${g2Contacts?.length}`);

  // Delete Group A, Group B unaffected
  await supabase.from("network_groups").delete().eq("id", g1!.id);
  createdGroupIds.splice(createdGroupIds.indexOf(g1!.id), 1);

  const { data: g2After } = await supabase
    .from("network_contacts")
    .select("name")
    .eq("group_id", g2!.id);
  assert(g2After?.length === 1, "Group B contacts unaffected by Group A deletion");

  console.log("  Multiple groups independence passed");
}

// ============================================================
// Run all tests
// ============================================================

async function main() {
  console.log("=== Network Integration Tests ===\n");

  try {
    await testGroupCrud();
    await testContactCrud();
    await testInvalidSection();
    await testCascadeDelete();
    await testFkConstraint();
    await testMetWithFlow();
    await testMetWithNoNotes();
    await testSortOrderUpdate();
    await testCrossSectionMove();
    await testMultipleGroups();
  } catch (err) {
    console.error("\nUnexpected error:", err);
    failed++;
  } finally {
    await cleanup();
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main();
