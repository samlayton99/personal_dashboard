"use server";

import { revalidatePath } from "next/cache";
import { MAX_ACTIVE_PUSHES, TODO_FUTURE_THRESHOLD_DAYS, DEFAULT_TODO_PRIORITY, REFLECTION_ESCAPE_HATCH_LENGTH, METRICS_WINDOW_DAYS } from "@/lib/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isTempId } from "@/lib/utils/temp-id";

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
  const supabase = await createServerSupabaseClient();
  const id = crypto.randomUUID();

  const { data: maxOrder } = await supabase
    .from("objectives")
    .select("sort_order")
    .eq("status", "active")
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
  if (isTempId(id)) return;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("objectives").update(data).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderObjectives(orderedIds: string[]) {
  const realIds = orderedIds.filter((id) => !isTempId(id));
  if (realIds.length === 0) return;
  const supabase = await createServerSupabaseClient();
  const updates = realIds.map((id, index) =>
    supabase.from("objectives").update({ sort_order: index }).eq("id", id)
  );
  await Promise.all(updates);
}

export async function retireObjective(id: string, retirementNote: string) {
  const supabase = await createServerSupabaseClient();

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
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("objectives")
    .update({ status: "active", retirement_note: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteObjective(id: string) {
  const supabase = await createServerSupabaseClient();

  // Delete all links in parallel, then delete the objective
  await Promise.all([
    supabase.from("objective_tags").delete().eq("objective_id", id),
    supabase.from("push_objective_links").delete().eq("objective_id", id),
    supabase.from("action_objective_links").delete().eq("objective_id", id),
  ]);

  const { error } = await supabase.from("objectives").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================
// TAGS
// ============================================================

export async function createTag(name: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tags")
    .insert({ name })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateObjectiveTags(objectiveId: string, tagIds: number[]) {
  if (isTempId(objectiveId)) return;
  const supabase = await createServerSupabaseClient();

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
  const supabase = await createServerSupabaseClient();

  let panel = data.panel;
  if (data.due_date) {
    const target = new Date(data.due_date);
    const now = new Date();
    const diffDays = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > TODO_FUTURE_THRESHOLD_DAYS) panel = "future";
  }

  const { data: maxOrder } = await supabase
    .from("todos")
    .select("sort_order")
    .eq("panel", panel)
    .eq("is_completed", false)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const { data: todo, error } = await supabase.from("todos").insert({
    description: data.description,
    panel,
    push_id: data.push_id ?? null,
    priority: data.priority ?? DEFAULT_TODO_PRIORITY,
    due_date: data.due_date ?? null,
    sort_order: (maxOrder?.sort_order ?? -1) + 1,
    source: "manual",
  }).select("id").single();

  if (error) throw new Error(error.message);
  return todo.id;
}

export async function toggleTodoComplete(id: string, isCompleted: boolean) {
  if (isTempId(id)) return;
  const supabase = await createServerSupabaseClient();
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
  if (isTempId(id)) return;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("todos").update(data).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderTodos(
  updates: { id: string; panel: "now" | "in_progress" | "future"; sort_order: number }[]
) {
  const realUpdates = updates.filter((u) => !isTempId(u.id));
  if (realUpdates.length === 0) return;
  const supabase = await createServerSupabaseClient();
  const ops = realUpdates.map((u) =>
    supabase.from("todos").update({ panel: u.panel, sort_order: u.sort_order }).eq("id", u.id)
  );
  await Promise.all(ops);
}

export async function deleteTodo(id: string) {
  if (isTempId(id)) return;
  const supabase = await createServerSupabaseClient();
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
}): Promise<{ id: string; sort_order: number }> {
  const supabase = await createServerSupabaseClient();

  const { count } = await supabase
    .from("pushes")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  if ((count ?? 0) >= MAX_ACTIVE_PUSHES) {
    throw new Error(`Maximum ${MAX_ACTIVE_PUSHES} active pushes allowed`);
  }

  const { data: maxOrder } = await supabase
    .from("pushes")
    .select("sort_order")
    .eq("status", "active")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sortOrder = (maxOrder?.sort_order ?? -1) + 1;
  const id = crypto.randomUUID();
  const { error } = await supabase.from("pushes").insert({
    id,
    name: data.name,
    description: data.description ?? null,
    todos_notes: data.todos_notes ?? null,
    notes: data.notes ?? null,
    sort_order: sortOrder,
  });

  if (error) throw new Error(error.message);
  return { id, sort_order: sortOrder };
}

export async function updatePush(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    notes?: string | null;
  }
) {
  if (isTempId(id)) return;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("pushes").update(data).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function retirePush(
  id: string,
  reason: "completed" | "failed" | "na",
  note: string
) {
  if (isTempId(id)) return;
  const supabase = await createServerSupabaseClient();

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
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("pushes")
    .update({ status: "active", retirement_reason: null, retirement_note: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletePush(id: string) {
  if (isTempId(id)) return;
  const supabase = await createServerSupabaseClient();

  // Clear all references in parallel, then delete the push
  await Promise.all([
    supabase.from("push_objective_links").delete().eq("push_id", id),
    supabase.from("action_push_links").delete().eq("push_id", id),
    supabase.from("todos").update({ push_id: null }).eq("push_id", id),
  ]);

  const { error } = await supabase.from("pushes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderPushes(orderedIds: string[]) {
  const realIds = orderedIds.filter((id) => !isTempId(id));
  if (realIds.length === 0) return;
  const supabase = await createServerSupabaseClient();
  await Promise.all(
    realIds.map((id, index) =>
      supabase.from("pushes").update({ sort_order: index }).eq("id", id)
    )
  );
}

export async function updatePushObjectives(pushId: string, objectiveIds: string[]) {
  if (isTempId(pushId)) return;
  const supabase = await createServerSupabaseClient();

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

// ============================================================
// REFLECTIONS & ACTIONS
// ============================================================

export async function createReflection(data: {
  raw_text: string;
  date: string;
  covers_since: string;
}): Promise<string> {
  const supabase = await createServerSupabaseClient();

  const { data: reflection, error } = await supabase
    .from("daily_reflections")
    .insert({
      raw_text: data.raw_text,
      date: data.date,
      covers_since: data.covers_since,
      is_escape_hatch: data.raw_text.length < REFLECTION_ESCAPE_HATCH_LENGTH,
    })
    .select("id")
    .single();

  if (error) {
    // Handle duplicate date — update the existing reflection with new text
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("daily_reflections")
        .update({
          raw_text: data.raw_text,
          covers_since: data.covers_since,
          is_escape_hatch: data.raw_text.length < REFLECTION_ESCAPE_HATCH_LENGTH,
        })
        .eq("date", data.date)
        .select("id")
        .single();
      if (existing) return existing.id;
    }
    throw new Error(error.message);
  }

  return reflection.id;
}

export async function finalizeActions(data: {
  reflectionId: string;
  reflectionDate: string;
  effectiveLockDate: string;
  actions: Array<{
    id: string;
    description: string;
    needle_score: number;
    push_ids: string[];
    objective_ids: string[];
    status: "accepted" | "edited" | "rejected";
  }>;
}) {
  const supabase = await createServerSupabaseClient();

  // Process all actions in parallel — each action's operations are independent
  await Promise.all(data.actions.map(async (action) => {
    if (action.status === "rejected") {
      // Delete links in parallel, then delete the action itself
      await Promise.all([
        supabase.from("action_push_links").delete().eq("action_id", action.id),
        supabase.from("action_objective_links").delete().eq("action_id", action.id),
      ]);
      await Promise.all([
        supabase.from("actions").delete().eq("id", action.id),
        supabase.from("events")
          .update({ status: "rejected" })
          .eq("event_type", "action_proposed")
          .eq("payload->>action_id", action.id),
      ]);
    } else {
      // Update action + replace links in parallel
      await Promise.all([
        supabase.from("actions").update({
          description: action.description,
          needle_score: action.needle_score,
          status: action.status,
        }).eq("id", action.id),
        supabase.from("action_push_links").delete().eq("action_id", action.id),
        supabase.from("action_objective_links").delete().eq("action_id", action.id),
      ]);

      // Insert new links + update event in parallel
      const insertOps: PromiseLike<unknown>[] = [];
      if (action.push_ids.length > 0) {
        insertOps.push(supabase.from("action_push_links").insert(
          action.push_ids.map((push_id) => ({ action_id: action.id, push_id }))
        ));
      }
      if (action.objective_ids.length > 0) {
        insertOps.push(supabase.from("action_objective_links").insert(
          action.objective_ids.map((objective_id) => ({ action_id: action.id, objective_id }))
        ));
      }
      insertOps.push(
        supabase.from("events")
          .update({ status: "approved" })
          .eq("event_type", "action_proposed")
          .eq("payload->>action_id", action.id)
      );
      await Promise.all(insertOps);
    }
  }));

  // Unlock the dashboard
  // Use effectiveLockDate: if unlocking before 10 PM (catch-up), this is yesterday
  // so tonight's 10 PM lock still fires. If at/after 10 PM, this is today.
  await supabase
    .from("system_state")
    .update({
      is_locked: false,
      last_reflection_date: data.effectiveLockDate,
    })
    .eq("id", 1);

  // Insert unlock event
  await supabase.from("events").insert({
    agent_name: "system",
    event_type: "lock_released",
    payload: {
      summary: `Dashboard unlocked after reflection on ${data.reflectionDate}`,
      reflection_id: data.reflectionId,
    },
    status: "executed",
  });

  // Recompute objective metrics
  await recomputeObjectiveMetrics();

  // Mark /first-principles stale so the next render fetches fresh data.
  // Do NOT rely on client router.refresh() here — combining it with a
  // subsequent router.push() (tab click) races the App Router transition
  // and can leave tab navigations stuck with the loading bar spinning.
  revalidatePath("/first-principles");
}

export async function deleteAction(id: string) {
  const supabase = await createServerSupabaseClient();

  await Promise.all([
    supabase.from("action_push_links").delete().eq("action_id", id),
    supabase.from("action_objective_links").delete().eq("action_id", id),
  ]);

  const { error } = await supabase.from("actions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await recomputeObjectiveMetrics();
}

export async function deleteActions(ids: string[]) {
  if (ids.length === 0) return;
  const supabase = await createServerSupabaseClient();

  await supabase.from("action_push_links").delete().in("action_id", ids);
  await supabase.from("action_objective_links").delete().in("action_id", ids);

  const { error } = await supabase.from("actions").delete().in("id", ids);
  if (error) throw new Error(error.message);
  await recomputeObjectiveMetrics();
}

export async function recomputeObjectiveMetrics() {
  const supabase = await createServerSupabaseClient();

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - METRICS_WINDOW_DAYS);

  // Fetch action links, total actions, and active objectives in parallel
  const [{ data: actionLinks }, { data: totalActions }, { data: activeObjectives }] = await Promise.all([
    supabase
      .from("action_objective_links")
      .select("action_id, objective_id, actions!inner(needle_score, created_at)")
      .gte("actions.created_at", ninetyDaysAgo.toISOString()),
    supabase
      .from("actions")
      .select("id")
      .in("status", ["accepted", "edited"])
      .gte("created_at", ninetyDaysAgo.toISOString()),
    supabase
      .from("objectives")
      .select("id")
      .eq("status", "active"),
  ]);

  const totalCount = totalActions?.length || 1; // avoid division by zero

  // Group by objective
  const objectiveData: Record<string, { count: number; scores: number[] }> = {};
  for (const link of actionLinks ?? []) {
    if (!objectiveData[link.objective_id]) {
      objectiveData[link.objective_id] = { count: 0, scores: [] };
    }
    objectiveData[link.objective_id].count++;
    const action = link.actions as unknown as { needle_score: number };
    if (action.needle_score != null) {
      objectiveData[link.objective_id].scores.push(action.needle_score);
    }
  }

  // Update all objectives in parallel
  await Promise.all((activeObjectives ?? []).map((obj) => {
    const data = objectiveData[obj.id];
    const priority = data ? Math.round((data.count / totalCount) * 100) : 0;
    const needleMovement = data?.scores.length ? median(data.scores) : 0;

    return supabase
      .from("objectives")
      .update({ current_priority: priority, needle_movement: needleMovement })
      .eq("id", obj.id);
  }));
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}
