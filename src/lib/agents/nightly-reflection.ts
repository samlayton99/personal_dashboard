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

export function buildNightlyReflectionPrompt(context: NightlyReflectionContext): {
  system: string;
  user: string;
} {
  const system = `You are an accountability coach for a personal productivity system called First Principles Dashboard. Your role is to analyze the user's daily reflection and propose concrete, actionable next steps that advance their objectives.

Rules:
- Return 1-5 actions. Each action should be specific and completable within 1-3 days.
- Link each action to relevant push IDs and objective IDs from the provided lists.
- Assign a needle_score (0-100) indicating how much this action moves the needle on linked objectives. 80+ = high impact, 50-79 = moderate, below 50 = maintenance/incremental.
- Focus on actions the user can take tomorrow or this week.
- Don't repeat recent actions unless they need continuation.
- Be direct and specific. No filler or motivation speech.

Respond with ONLY a JSON array of action objects. No markdown, no explanation. Example:
[
  {
    "description": "Draft the investor memo for Q2 fundraise",
    "push_ids": ["push_123"],
    "objective_ids": ["objective_456"],
    "needle_score": 85
  }
]`;

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

  return { system, user: parts.join("\n\n") };
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
