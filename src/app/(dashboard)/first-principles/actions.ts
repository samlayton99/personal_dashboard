"use server";

import { createClient } from "@/lib/supabase/server";

// ============================================================
// OBJECTIVES
// ============================================================

export async function createObjective(data: {
  name: string;
  description?: string;
  ideas?: string;
  hypothesis?: string;
  other_notes?: string;
}) {
  const supabase = await createClient();
  const id = `objective_${Date.now()}`;

  const { data: maxOrder } = await supabase
    .from("objectives")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const { error } = await supabase.from("objectives").insert({
    id,
    name: data.name,
    description: data.description ?? null,
    ideas: data.ideas ?? null,
    hypothesis: data.hypothesis ?? null,
    other_notes: data.other_notes ?? null,
    sort_order: (maxOrder?.sort_order ?? -1) + 1,
  });

  if (error) throw new Error(error.message);
  return id;
}

export async function updateObjective(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    ideas?: string | null;
    hypothesis?: string | null;
    other_notes?: string | null;
    status?: "active" | "inactive";
    retirement_note?: string | null;
  }
) {
  if (id.startsWith("temp_")) return;
  const supabase = await createClient();
  const { error } = await supabase.from("objectives").update(data).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderObjectives(orderedIds: string[]) {
  const realIds = orderedIds.filter((id) => !id.startsWith("temp_"));
  if (realIds.length === 0) return;
  const supabase = await createClient();
  const updates = realIds.map((id, index) =>
    supabase.from("objectives").update({ sort_order: index }).eq("id", id)
  );
  await Promise.all(updates);
}

export async function retireObjective(id: string, retirementNote: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("objectives")
    .update({ status: "inactive", retirement_note: retirementNote })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await supabase.from("events").insert({
    agent_name: "system",
    event_type: "objective_retired",
    payload: { summary: `Objective retired: ${id}`, objective_id: id },
    status: "executed",
  });
}

export async function resurrectObjective(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("objectives")
    .update({ status: "active", retirement_note: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteObjective(id: string) {
  const supabase = await createClient();

  await supabase.from("objective_tags").delete().eq("objective_id", id);
  await supabase.from("push_objective_links").delete().eq("objective_id", id);
  await supabase.from("action_objective_links").delete().eq("objective_id", id);

  const { error } = await supabase.from("objectives").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================
// TAGS
// ============================================================

export async function createTag(name: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .insert({ name })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateObjectiveTags(objectiveId: string, tagIds: number[]) {
  if (objectiveId.startsWith("temp_")) return;
  const supabase = await createClient();

  await supabase.from("objective_tags").delete().eq("objective_id", objectiveId);

  if (tagIds.length > 0) {
    const rows = tagIds.map((tag_id) => ({ objective_id: objectiveId, tag_id }));
    const { error } = await supabase.from("objective_tags").insert(rows);
    if (error) throw new Error(error.message);
  }
}

// ============================================================
// TODOS
// ============================================================

export async function createTodo(data: {
  description: string;
  panel: "now" | "in_progress" | "future";
  push_id?: string;
  priority?: number;
  due_date?: string;
}) {
  const supabase = await createClient();

  let panel = data.panel;
  if (data.due_date) {
    const target = new Date(data.due_date);
    const now = new Date();
    const diffDays = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 4) panel = "future";
  }

  const { data: maxOrder } = await supabase
    .from("todos")
    .select("sort_order")
    .eq("panel", panel)
    .eq("is_completed", false)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const { error } = await supabase.from("todos").insert({
    description: data.description,
    panel,
    push_id: data.push_id ?? null,
    priority: data.priority ?? 5,
    due_date: data.due_date ?? null,
    sort_order: (maxOrder?.sort_order ?? -1) + 1,
    source: "manual",
  });

  if (error) throw new Error(error.message);
}

export async function toggleTodoComplete(id: string, isCompleted: boolean) {
  if (id.startsWith("temp_")) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("todos")
    .update({
      is_completed: isCompleted,
      date_completed: isCompleted ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateTodo(
  id: string,
  data: {
    description?: string;
    panel?: "now" | "in_progress" | "future";
    push_id?: string | null;
    priority?: number;
    due_date?: string | null;
    sort_order?: number;
  }
) {
  if (id.startsWith("temp_")) return;
  const supabase = await createClient();
  const { error } = await supabase.from("todos").update(data).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderTodos(
  updates: { id: string; panel: "now" | "in_progress" | "future"; sort_order: number }[]
) {
  const realUpdates = updates.filter((u) => !u.id.startsWith("temp_"));
  if (realUpdates.length === 0) return;
  const supabase = await createClient();
  const ops = realUpdates.map((u) =>
    supabase.from("todos").update({ panel: u.panel, sort_order: u.sort_order }).eq("id", u.id)
  );
  await Promise.all(ops);
}

export async function deleteTodo(id: string) {
  if (id.startsWith("temp_")) return;
  const supabase = await createClient();
  const { error } = await supabase.from("todos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================
// PUSHES
// ============================================================

export async function createPush(data: {
  name: string;
  description?: string;
  todos_notes?: string;
  notes?: string;
}): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const id = `push_${Date.now()}`;

  const { count } = await supabase
    .from("pushes")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  if ((count ?? 0) >= 5) {
    return { error: "Maximum 5 active pushes allowed" };
  }

  const { data: maxOrder } = await supabase
    .from("pushes")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const { error } = await supabase.from("pushes").insert({
    id,
    name: data.name,
    description: data.description ?? null,
    todos_notes: data.todos_notes ?? null,
    notes: data.notes ?? null,
    sort_order: (maxOrder?.sort_order ?? -1) + 1,
  });

  if (error) return { error: error.message };
  return { id };
}

export async function updatePush(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    notes?: string | null;
  }
) {
  if (id.startsWith("push_temp_")) return;
  const supabase = await createClient();
  const { error } = await supabase.from("pushes").update(data).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function retirePush(
  id: string,
  reason: "completed" | "failed" | "na",
  note: string
) {
  if (id.startsWith("push_temp_")) return;
  const supabase = await createClient();

  const { data: push } = await supabase
    .from("pushes")
    .select("name")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("pushes")
    .update({
      status: "inactive",
      retirement_reason: reason,
      retirement_note: note,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await supabase.from("events").insert({
    agent_name: "system",
    event_type: "push_retired",
    payload: {
      summary: `Push retired: ${push?.name ?? id}`,
      push_id: id,
      reason,
    },
    status: "executed",
  });
}

export async function resurrectPush(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pushes")
    .update({ status: "active", retirement_reason: null, retirement_note: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletePush(id: string) {
  if (id.startsWith("push_temp_")) return;
  const supabase = await createClient();

  await supabase.from("push_objective_links").delete().eq("push_id", id);
  await supabase.from("action_push_links").delete().eq("push_id", id);
  await supabase.from("todos").update({ push_id: null }).eq("push_id", id);

  const { error } = await supabase.from("pushes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updatePushObjectives(pushId: string, objectiveIds: string[]) {
  if (pushId.startsWith("push_temp_")) return;
  const supabase = await createClient();

  await supabase.from("push_objective_links").delete().eq("push_id", pushId);

  if (objectiveIds.length > 0) {
    const rows = objectiveIds.map((objective_id) => ({
      push_id: pushId,
      objective_id,
    }));
    const { error } = await supabase.from("push_objective_links").insert(rows);
    if (error) throw new Error(error.message);
  }
}
