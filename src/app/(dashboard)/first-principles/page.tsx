import { createClient } from "@/lib/supabase/server";
import { FirstPrinciplesClient } from "./client";

export default async function FirstPrinciplesPage() {
  const supabase = await createClient();

  const objectivesRes = await supabase
    .from("objectives")
    .select("*")
    .eq("status", "active")
    .order("sort_order");

  const tagsRes = await supabase.from("tags").select("*").order("name");

  const objectiveTagsRes = await supabase
    .from("objective_tags")
    .select("objective_id, tag_id");

  const todosRes = await supabase
    .from("todos")
    .select("*")
    .eq("is_completed", false)
    .order("sort_order");

  const pushesRes = await supabase
    .from("pushes")
    .select("*")
    .eq("status", "active")
    .order("sort_order");

  const pushObjLinksRes = await supabase
    .from("push_objective_links")
    .select("push_id, objective_id");

  const objectives = objectivesRes.data ?? [];
  const tags = tagsRes.data ?? [];
  const objectiveTags = objectiveTagsRes.data ?? [];
  const todos = todosRes.data ?? [];
  const pushes = pushesRes.data ?? [];
  const pushObjLinks = pushObjLinksRes.data ?? [];

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
    />
  );
}
