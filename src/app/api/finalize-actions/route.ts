import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { recomputeObjectiveMetrics } from "@/app/(dashboard)/first-principles/actions";
import { getLastLockBoundary } from "@/lib/utils/lock";
import { isTempId } from "@/lib/utils/temp-id";

export async function POST(request: Request) {
  try {
    const data: {
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
    } = await request.json();

    const supabase = await createServerSupabaseClient();

    // Process all actions in parallel
    await Promise.all(data.actions.map(async (action) => {
      if (action.status === "rejected") {
        // Manually added actions that are rejected can be skipped entirely
        if (isTempId(action.id)) return;
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
      } else if (isTempId(action.id)) {
        // Manually added action -- insert with a real ID
        const { data: inserted } = await supabase.from("actions").insert({
          id: crypto.randomUUID(),
          description: action.description,
          needle_score: action.needle_score,
          status: action.status,
          reflection_id: data.reflectionId,
          date: data.reflectionDate,
        }).select("id").single();

        if (!inserted) return;

        // Insert links
        const linkOps: PromiseLike<unknown>[] = [];
        if (action.push_ids.length > 0) {
          linkOps.push(supabase.from("action_push_links").insert(
            action.push_ids.map((push_id) => ({ action_id: inserted.id, push_id }))
          ));
        }
        if (action.objective_ids.length > 0) {
          linkOps.push(supabase.from("action_objective_links").insert(
            action.objective_ids.map((objective_id) => ({ action_id: inserted.id, objective_id }))
          ));
        }
        if (linkOps.length > 0) await Promise.all(linkOps);
      } else {
        // AI-generated action -- update existing
        await Promise.all([
          supabase.from("actions").update({
            description: action.description,
            needle_score: action.needle_score,
            status: action.status,
          }).eq("id", action.id),
          supabase.from("action_push_links").delete().eq("action_id", action.id),
          supabase.from("action_objective_links").delete().eq("action_id", action.id),
        ]);

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

    // Fetch fresh data for the client before returning
    const [objectivesRes, todosRes] = await Promise.all([
      supabase.from("objectives").select("*").eq("status", "active").order("sort_order"),
      supabase
        .from("todos")
        .select("*")
        .or(`is_completed.eq.false,date_completed.gte.${getLastLockBoundary()}`)
        .order("sort_order"),
    ]);

    // Fire objective metrics recompute in background — don't block the response.
    // It also runs on every first-principles page load, so it'll catch up.
    recomputeObjectiveMetrics();

    return NextResponse.json({
      ok: true,
      objectives: objectivesRes.data ?? [],
      todos: todosRes.data ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
