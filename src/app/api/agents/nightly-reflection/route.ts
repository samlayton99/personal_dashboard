import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callLLM } from "@/lib/agents/llm";
import {
  buildNightlyReflectionPrompt,
  parseActionProposals,
  type NightlyReflectionContext,
} from "@/lib/agents/nightly-reflection";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reflection_id, date } = body as {
      reflection_id: string;
      date: string;
    };

    if (!reflection_id || !date) {
      return NextResponse.json(
        { error: "reflection_id and date are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch the reflection text
    const { data: reflection } = await supabase
      .from("daily_reflections")
      .select("raw_text")
      .eq("id", reflection_id)
      .single();

    if (!reflection) {
      return NextResponse.json(
        { error: "Reflection not found" },
        { status: 404 }
      );
    }

    // Gather context in parallel
    const [
      todosRes,
      actionsRes,
      pushesRes,
      objectivesRes,
      summariesRes,
      pushLinksRes,
    ] = await Promise.all([
      // Completed todos today
      supabase
        .from("todos")
        .select("description, push_id")
        .eq("is_completed", true)
        .gte("date_completed", `${date}T00:00:00`)
        .lte("date_completed", `${date}T23:59:59`),
      // Recent actions (last 7 days)
      supabase
        .from("actions")
        .select("description, needle_score, created_at")
        .in("status", ["accepted", "edited"])
        .order("created_at", { ascending: false })
        .limit(35),
      // Active pushes
      supabase
        .from("pushes")
        .select("id, name, description")
        .eq("status", "active"),
      // Active objectives
      supabase
        .from("objectives")
        .select("id, name, description")
        .eq("status", "active"),
      // Recent summaries (one of each type)
      supabase
        .from("summaries")
        .select("type, content")
        .order("created_at", { ascending: false })
        .limit(4),
      // Push-objective links for context
      supabase
        .from("push_objective_links")
        .select("push_id, objective_id"),
    ]);

    const context: NightlyReflectionContext = {
      reflectionText: reflection.raw_text,
      completedTodos: todosRes.data ?? [],
      recentActions: (actionsRes.data ?? []).map((a) => ({
        description: a.description,
        needle_score: a.needle_score,
        created_at: a.created_at,
      })),
      activePushes: (pushesRes.data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
      })),
      activeObjectives: (objectivesRes.data ?? []).map((o) => ({
        id: o.id,
        name: o.name,
        description: o.description,
      })),
      recentSummaries: (summariesRes.data ?? []).map((s) => ({
        type: s.type,
        content: s.content,
      })),
    };

    // Call LLM
    const { system, user } = buildNightlyReflectionPrompt(context);
    const llmResponse = await callLLM(system, user);

    // Parse response
    let proposals;
    try {
      proposals = parseActionProposals(llmResponse);
    } catch {
      // Retry once on parse failure
      const retryResponse = await callLLM(
        system,
        user + "\n\nIMPORTANT: Respond with ONLY a valid JSON array. No markdown."
      );
      proposals = parseActionProposals(retryResponse);
    }

    // Filter push_ids and objective_ids to only include valid active ones
    const validPushIds = new Set((pushesRes.data ?? []).map((p) => p.id));
    const validObjectiveIds = new Set((objectivesRes.data ?? []).map((o) => o.id));

    // Create actions in database
    const createdActions = [];
    for (const proposal of proposals) {
      const filteredPushIds = proposal.push_ids.filter((id) => validPushIds.has(id));
      const filteredObjectiveIds = proposal.objective_ids.filter((id) =>
        validObjectiveIds.has(id)
      );

      // If no objectives linked but pushes are, infer objectives from push links
      let finalObjectiveIds = filteredObjectiveIds;
      if (finalObjectiveIds.length === 0 && filteredPushIds.length > 0) {
        const linkedObjIds = (pushLinksRes.data ?? [])
          .filter((l) => filteredPushIds.includes(l.push_id))
          .map((l) => l.objective_id);
        finalObjectiveIds = [...new Set(linkedObjIds)].filter((id) =>
          validObjectiveIds.has(id)
        );
      }

      // Insert action
      const actionId = `action_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const { data: action, error: actionError } = await supabase
        .from("actions")
        .insert({
          id: actionId,
          description: proposal.description,
          needle_score: proposal.needle_score,
          status: "pending",
          reflection_id: reflection_id,
          date,
        })
        .select("id")
        .single();

      if (actionError) {
        console.error("Failed to create action:", actionError);
        continue;
      }

      // Insert push links
      if (filteredPushIds.length > 0) {
        await supabase.from("action_push_links").insert(
          filteredPushIds.map((push_id) => ({
            action_id: action.id,
            push_id,
          }))
        );
      }

      // Insert objective links
      if (finalObjectiveIds.length > 0) {
        await supabase.from("action_objective_links").insert(
          finalObjectiveIds.map((objective_id) => ({
            action_id: action.id,
            objective_id,
          }))
        );
      }

      // Insert event
      await supabase.from("events").insert({
        agent_name: "nightly-reflection",
        event_type: "action_proposed",
        payload: {
          summary: proposal.description,
          action_id: action.id,
          reflection_id,
        },
        status: "pending_approval",
        requires_approval: true,
      });

      createdActions.push({
        id: action.id,
        description: proposal.description,
        needle_score: proposal.needle_score,
        push_ids: filteredPushIds,
        objective_ids: finalObjectiveIds,
        status: "pending" as const,
      });
    }

    return NextResponse.json({ actions: createdActions });
  } catch (err) {
    console.error("Nightly reflection error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
