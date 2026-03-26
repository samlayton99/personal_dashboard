export interface TodoProposal {
  description: string;
  panel: "now" | "in_progress" | "future";
  due_date: string | null;
}

export interface TodoParserContext {
  todoText: string;
  currentDate: string;
}

export function buildTodoParserPrompt(
  systemPrompt: string,
  context: TodoParserContext
): { system: string; user: string } {
  const parts: string[] = [];

  // Give the LLM rich date context for relative day parsing
  const date = new Date(context.currentDate + "T12:00:00");
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayOfWeek = dayNames[date.getDay()];

  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const tomorrowDay = dayNames[tomorrow.getDay()];

  parts.push(
    `## Date Context\n` +
    `Today: ${dayOfWeek}, ${context.currentDate}\n` +
    `Tomorrow: ${tomorrowDay}, ${tomorrowStr}`
  );

  parts.push(`## User's Todo List\n${context.todoText}`);
  return { system: systemPrompt, user: parts.join("\n\n") };
}

export function parseTodoProposals(raw: string): TodoProposal[] {
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error("Expected JSON array of todos");

  const validPanels = new Set(["now", "in_progress", "future"]);

  return parsed.map((item: Record<string, unknown>, i: number) => {
    if (typeof item.description !== "string" || !item.description) {
      throw new Error(`Todo ${i}: missing description`);
    }
    const panel =
      typeof item.panel === "string" && validPanels.has(item.panel)
        ? (item.panel as "now" | "in_progress" | "future")
        : "now";
    const due_date = typeof item.due_date === "string" ? item.due_date : null;
    return { description: item.description, panel, due_date };
  });
}
