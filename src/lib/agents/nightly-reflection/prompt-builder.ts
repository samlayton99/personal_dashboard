export interface ActionProposal {
  description: string;
  push_ids: string[];
  objective_ids: string[];
  needle_score: number;
}

export interface NightlyReflectionContext {
  reflectionText: string;
  completedTodos: Array<{ description: string; push_id: string | null }>;
  recentActions: Array<{
    description: string;
    needle_score: number;
    created_at: string;
  }>;
  activePushes: Array<{ id: string; name: string; description: string | null }>;
  activeObjectives: Array<{ id: string; name: string; description: string | null }>;
  recentSummaries: Array<{ type: string; content: string }>;
}

export function buildNightlyReflectionPrompt(
  systemPrompt: string,
  context: NightlyReflectionContext
): {
  system: string;
  user: string;
} {
  const parts: string[] = [];

  parts.push(`## User's Reflection\n${context.reflectionText}`);

  if (context.completedTodos.length > 0) {
    parts.push(
      `## Completed Todos Today\n${context.completedTodos
        .map((t) => `- ${t.description}`)
        .join("\n")}`
    );
  }

  if (context.recentActions.length > 0) {
    parts.push(
      `## Recent Actions (Last 7 Days)\n${context.recentActions
        .map(
          (a) =>
            `- [score: ${a.needle_score}] ${a.description} (${a.created_at.split("T")[0]})`
        )
        .join("\n")}`
    );
  }

  parts.push(
    `## Active Pushes\n${context.activePushes
      .map((p) => `- ID: ${p.id} | Name: ${p.name}${p.description ? ` | ${p.description}` : ""}`)
      .join("\n")}`
  );

  parts.push(
    `## Active Objectives\n${context.activeObjectives
      .map((o) => `- ID: ${o.id} | Name: ${o.name}${o.description ? ` | ${o.description}` : ""}`)
      .join("\n")}`
  );

  if (context.recentSummaries.length > 0) {
    parts.push(
      `## Recent Summaries\n${context.recentSummaries
        .map((s) => `### ${s.type}\n${s.content}`)
        .join("\n\n")}`
    );
  }

  return { system: systemPrompt, user: parts.join("\n\n") };
}

/**
 * Parse the LLM response into ActionProposal[].
 * Handles JSON wrapped in markdown code blocks.
 */
export function parseActionProposals(raw: string): ActionProposal[] {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error("Expected JSON array of actions");
  }

  return parsed.map((item: Record<string, unknown>, i: number) => {
    if (typeof item.description !== "string" || !item.description) {
      throw new Error(`Action ${i}: missing description`);
    }
    return {
      description: item.description,
      push_ids: Array.isArray(item.push_ids) ? item.push_ids.filter((id): id is string => typeof id === "string") : [],
      objective_ids: Array.isArray(item.objective_ids) ? item.objective_ids.filter((id): id is string => typeof id === "string") : [],
      needle_score: typeof item.needle_score === "number" ? Math.max(0, Math.min(100, item.needle_score)) : 50,
    };
  });
}
