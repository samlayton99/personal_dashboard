import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadAgentConfig } from "@/lib/agents/loader";
import { callLLM } from "@/lib/agents/llm";
import {
  buildTodoParserPrompt,
  parseTodoProposals,
} from "@/lib/agents/todo-parser/prompt-builder";

export async function POST(req: NextRequest) {
  try {
    const config = loadAgentConfig("todo-parser");
    const body = await req.json();
    const { todo_text, date } = body as {
      todo_text: string;
      date: string;
    };

    if (!todo_text || !date) {
      return NextResponse.json(
        { error: "todo_text and date are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Build prompt and call LLM
    const { system, user } = buildTodoParserPrompt(config.system_prompt, {
      todoText: todo_text,
      currentDate: date,
    });
    const llmResponse = await callLLM(system, user, config.model);

    // Parse response with retry
    let proposals;
    try {
      proposals = parseTodoProposals(llmResponse);
    } catch {
      if (config.retry.parse_retries > 0) {
        const retryResponse = await callLLM(
          system,
          user + config.retry.retry_suffix,
          config.model
        );
        proposals = parseTodoProposals(retryResponse);
      } else {
        throw new Error("Failed to parse LLM response as valid todos");
      }
    }

    // Create todos in database
    const createdTodos = [];
    for (const proposal of proposals) {
      // Get max sort_order for this panel
      const { data: maxOrder } = await supabase
        .from("todos")
        .select("sort_order")
        .eq("panel", proposal.panel)
        .eq("is_completed", false)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

      const { data: todo, error: todoError } = await supabase
        .from("todos")
        .insert({
          description: proposal.description,
          panel: proposal.panel,
          due_date: proposal.due_date,
          source: "agent",
          priority: 5,
          sort_order: (maxOrder?.sort_order ?? -1) + 1,
        })
        .select("id, description, panel, due_date")
        .single();

      if (todoError) {
        console.error("Failed to create todo:", todoError);
        continue;
      }

      createdTodos.push(todo);
    }

    // Log event
    await supabase.from("events").insert({
      agent_name: config.name,
      event_type: (config.behavior.event_type as string) ?? "todos_parsed",
      payload: {
        summary: `Parsed ${createdTodos.length} todos from user input`,
        count: createdTodos.length,
      },
      status: "executed",
      requires_approval: false,
    });

    return NextResponse.json({ todos: createdTodos });
  } catch (err) {
    console.error("Todo parser error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
