import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Check if already locked
  const { data: state } = await supabase
    .from("system_state")
    .select("is_locked")
    .eq("id", 1)
    .single();

  if (state?.is_locked) {
    return new Response(JSON.stringify({ message: "Already locked" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Lock the dashboard
  await supabase
    .from("system_state")
    .update({ is_locked: true, locked_at: new Date().toISOString() })
    .eq("id", 1);

  // Log the event
  await supabase.from("events").insert({
    agent_name: "system",
    event_type: "lock_triggered",
    payload: { summary: "Dashboard locked for nightly reflection" },
    status: "executed",
  });

  return new Response(
    JSON.stringify({ message: "Dashboard locked" }),
    { headers: { "Content-Type": "application/json" } }
  );
});
