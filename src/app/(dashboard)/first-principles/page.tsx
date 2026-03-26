import { createClient } from "@/lib/supabase/server";
import { getSystemState } from "@/lib/supabase/cached-queries";
import { computeFeaturedActionScore } from "@/lib/utils/scoring";
import { recomputeObjectiveMetrics } from "./actions";
import { FirstPrinciplesClient } from "./client";
import type { FeaturedAction } from "@/types/featured-actions";

export default async function FirstPrinciplesPage() {
  const supabase = await createClient();

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Recompute objective metrics in parallel with data fetching
  // to ensure priority/needle scores stay fresh
  const [
    ,
    systemState,
    objectivesRes,
    tagsRes,
    objectiveTagsRes,
    todosRes,
    pushesRes,
    pushObjLinksRes,
    reflectionsRes,
    recentActionsRes,
    actionObjLinksRes,
    actionPushLinksRes,
  ] = await Promise.all([
    recomputeObjectiveMetrics(),
    getSystemState(),
    supabase
      .from("objectives")
      .select("*")
      .eq("status", "active")
      .order("sort_order"),
    supabase.from("tags").select("*").order("name"),
    supabase.from("objective_tags").select("objective_id, tag_id"),
    supabase
      .from("todos")
      .select("*")
      .eq("is_completed", false)
      .order("sort_order"),
    supabase
      .from("pushes")
      .select("*")
      .eq("status", "active")
      .order("sort_order"),
    supabase.from("push_objective_links").select("push_id, objective_id"),
    supabase
      .from("daily_reflections")
      .select("date")
      .order("date", { ascending: false })
      .limit(90),
    supabase
      .from("actions")
      .select("*")
      .in("status", ["accepted", "edited"])
      .gte("created_at", ninetyDaysAgo.toISOString()),
    supabase.from("action_objective_links").select("action_id, objective_id"),
    supabase.from("action_push_links").select("action_id, push_id"),
  ]);

  const objectives = objectivesRes.data ?? [];
  const tags = tagsRes.data ?? [];
  const objectiveTags = objectiveTagsRes.data ?? [];
  const todos = todosRes.data ?? [];
  const pushes = pushesRes.data ?? [];
  const pushObjLinks = pushObjLinksRes.data ?? [];

  // Compute per-push action distribution for last 3 weeks
  const recentActions = recentActionsRes.data ?? [];
  const actionPushLinks = actionPushLinksRes.data ?? [];

  const twentyOneDaysAgo = new Date();
  twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21);
  const threeWeekActionIds = new Set(
    recentActions
      .filter((a) => new Date(a.created_at) >= twentyOneDaysAgo)
      .map((a) => a.id)
  );

  const activePushIds = new Set(pushes.map((p) => p.id));
  const pushActionCounts: Record<string, number> = {};
  for (const link of actionPushLinks) {
    if (threeWeekActionIds.has(link.action_id) && activePushIds.has(link.push_id)) {
      pushActionCounts[link.push_id] = (pushActionCounts[link.push_id] ?? 0) + 1;
    }
  }

  const pushActionDistribution = pushes.map((p) => ({
    pushId: p.id,
    pushName: p.name,
    actionCount: pushActionCounts[p.id] ?? 0,
  }));

  // Build lookup maps
  const objectiveTagMap: Record<string, number[]> = {};
  for (const ot of objectiveTags) {
    if (!objectiveTagMap[ot.objective_id]) objectiveTagMap[ot.objective_id] = [];
    objectiveTagMap[ot.objective_id].push(ot.tag_id);
  }

  const pushObjectiveMap: Record<string, string[]> = {};
  for (const pol of pushObjLinks) {
    if (!pushObjectiveMap[pol.push_id]) pushObjectiveMap[pol.push_id] = [];
    pushObjectiveMap[pol.push_id].push(pol.objective_id);
  }

  const objectiveNameMap: Record<string, string> = {};
  for (const obj of objectives) {
    objectiveNameMap[obj.id] = obj.name;
  }

  const pushNameMap: Record<string, string> = {};
  for (const p of pushes) {
    pushNameMap[p.id] = p.name;
  }

  // Compute featured actions per objective and push
  const actionObjLinks = actionObjLinksRes.data ?? [];

  // Build action -> linked IDs maps
  const actionToObjIds: Record<string, string[]> = {};
  for (const link of actionObjLinks) {
    if (!actionToObjIds[link.action_id]) actionToObjIds[link.action_id] = [];
    actionToObjIds[link.action_id].push(link.objective_id);
  }
  const actionToPushIds: Record<string, string[]> = {};
  for (const link of actionPushLinks) {
    if (!actionToPushIds[link.action_id]) actionToPushIds[link.action_id] = [];
    actionToPushIds[link.action_id].push(link.push_id);
  }

  // Build scored FeaturedAction objects
  const now = Date.now();
  const scoredActions: FeaturedAction[] = recentActions.map((a) => {
    const daysAgo = Math.floor((now - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24));
    return {
      id: a.id,
      description: a.description,
      date: a.date,
      needle_score: a.needle_score,
      days_ago: daysAgo,
      score: computeFeaturedActionScore(a.needle_score, daysAgo),
      linked_objective_names: (actionToObjIds[a.id] ?? [])
        .map((oid) => objectiveNameMap[oid])
        .filter(Boolean),
      linked_push_names: (actionToPushIds[a.id] ?? [])
        .map((pid) => pushNameMap[pid])
        .filter(Boolean),
    };
  });

  // Group by objective, take top 2
  const objectiveFeaturedActions: Record<string, FeaturedAction[]> = {};
  for (const link of actionObjLinks) {
    const action = scoredActions.find((a) => a.id === link.action_id);
    if (!action) continue;
    if (!objectiveFeaturedActions[link.objective_id]) objectiveFeaturedActions[link.objective_id] = [];
    objectiveFeaturedActions[link.objective_id].push(action);
  }
  for (const objId of Object.keys(objectiveFeaturedActions)) {
    objectiveFeaturedActions[objId] = objectiveFeaturedActions[objId]
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
  }

  // Group by push, take top 2
  const pushFeaturedActions: Record<string, FeaturedAction[]> = {};
  for (const link of actionPushLinks) {
    const action = scoredActions.find((a) => a.id === link.action_id);
    if (!action) continue;
    if (!pushFeaturedActions[link.push_id]) pushFeaturedActions[link.push_id] = [];
    pushFeaturedActions[link.push_id].push(action);
  }
  for (const pushId of Object.keys(pushFeaturedActions)) {
    pushFeaturedActions[pushId] = pushFeaturedActions[pushId]
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
  }

  return (
    <FirstPrinciplesClient
      objectives={objectives}
      tags={tags}
      objectiveTagMap={objectiveTagMap}
      todos={todos}
      pushes={pushes}
      pushObjectiveMap={pushObjectiveMap}
      objectiveNameMap={objectiveNameMap}
      systemState={systemState ?? null}
      pushActionDistribution={pushActionDistribution}
      objectiveFeaturedActions={objectiveFeaturedActions}
      pushFeaturedActions={pushFeaturedActions}
    />
  );
}
