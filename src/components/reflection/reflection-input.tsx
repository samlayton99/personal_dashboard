"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createReflection } from "@/app/(dashboard)/first-principles/actions";
import { getLocalDateString } from "@/lib/utils/lock";

interface ReflectionInputProps {
  lastReflectionDate: string | null;
  onReflectionCreated: (reflectionId: string, date: string, todoText: string) => void;
  error: string | null;
}

export function ReflectionInput({
  lastReflectionDate,
  onReflectionCreated,
  error,
}: ReflectionInputProps) {
  const [text, setText] = useState("");
  const [todoText, setTodoText] = useState("");
  const [isPending, startTransition] = useTransition();

  const today = getLocalDateString();
  const hasMultiDayGap = lastReflectionDate
    ? daysBetween(lastReflectionDate, today) > 1
    : false;
  const coversSince = lastReflectionDate ?? today;

  function handleSubmit() {
    if (!text.trim() || isPending) return;

    startTransition(async () => {
      const id = await createReflection({
        raw_text: text.trim(),
        date: today,
        covers_since: coversSince,
      });
      onReflectionCreated(id, today, todoText);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Reflection card */}
      <div className="overflow-hidden rounded-lg border bg-white shadow-lg">
        <div className="bg-primary px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-foreground">
            {hasMultiDayGap
              ? `What have you been up to since ${formatDate(coversSince)}?`
              : "What did you do today?"}
          </h2>
          <p className="mt-0.5 text-xs text-primary-foreground/70">
            Reflect on your actions and progress. Even a sentence or two is fine.
          </p>
        </div>
        <div className="p-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Today I worked on..."
            className="min-h-[140px] max-h-[50vh] resize-none overflow-y-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            autoFocus
          />
        </div>
      </div>

      {/* Todo card */}
      <div className="overflow-hidden rounded-lg border bg-white shadow-lg">
        <div className="bg-primary px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-foreground">
            Todos to add
          </h2>
          <p className="mt-0.5 text-xs text-primary-foreground/70">
            Optional -- list any tasks you want to add to your board
          </p>
        </div>
        <div className="p-4">
          <Textarea
            value={todoText}
            onChange={(e) => setTodoText(e.target.value)}
            placeholder="Call dentist, finish report by Friday, research X next month..."
            className="min-h-[80px] max-h-[40vh] resize-none overflow-y-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!text.trim() || isPending}
          size="sm"
        >
          {isPending ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </div>
  );
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + "T00:00:00");
  const b = new Date(dateB + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
