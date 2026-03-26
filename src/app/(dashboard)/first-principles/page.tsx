import { createClient } from "@/lib/supabase/server";
import { startOfWeek, startOfMonth } from "@/lib/utils/dates";
import { FirstPrinciplesClient } from "./client";

export default async function FirstPrinciplesPage() {
  const supabase = await createClient();

  const [
    objectivesRes,
    tagsRes,
    objectiveTagsRes,
    todosRes,
    pushesRes,
    pushObjLinksRes,
    systemStateRes,
    reflectionsRes,
    actionsWeekRes,
    actionsMonthRes,
  ] = await Promise.all([
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
    supabase.from("system_state").select("*").eq("id", 1).single(),
    supabase
      .from("daily_reflections")
      .select("date")
      .order("date", { ascending: false })
      .limit(90),
    supabase
      .from("actions")
      .select("id")
      .in("status", ["accepted", "edited"])
      .gte("created_at", startOfWeek().toISOString()),
    supabase
      .from("actions")
      .select("id")
      .in("status", ["accepted", "edited"])
      .gte("created_at", startOfMonth().toISOString()),
  ]);

  const objectives = objectivesRes.data ?? [];
  const tags = tagsRes.data ?? [];
  const objectiveTags = objectiveTagsRes.data ?? [];
  const todos = todosRes.data ?? [];
  const pushes = pushesRes.data ?? [];
  const pushObjLinks = pushObjLinksRes.data ?? [];
  const systemState = systemStateRes.data;

  // Compute reflection streak
  const reflectionDates = (reflectionsRes.data ?? []).map((r) => r.date);
  let streak = 0;
  if (reflectionDates.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Start checking from today (or yesterday if today's reflection hasn't happened yet)
    const checkDate = new Date(today);
    // If the most recent reflection is today, start from today; otherwise start from yesterday
    const mostRecent = reflectionDates[0];
    const todayStr = today.toISOString().split("T")[0];
    if (mostRecent !== todayStr) {
      // Check if yesterday matches
      checkDate.setDate(checkDate.getDate() - 1);
    }
    for (const date of reflectionDates) {
      const expected = checkDate.toISOString().split("T")[0];
      if (date === expected) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  const scoreboardData = {
    streak,
    actionsThisWeek: actionsWeekRes.data?.length ?? 0,
    actionsThisMonth: actionsMonthRes.data?.length ?? 0,
  };

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
      scoreboardData={scoreboardData}
    />
  );
}
