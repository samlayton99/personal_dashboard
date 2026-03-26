"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createReflection } from "@/app/(dashboard)/first-principles/actions";
import { getLocalDateString } from "@/lib/utils/lock";

interface ReflectionInputProps {
  lastReflectionDate: string | null;
  onReflectionCreated: (reflectionId: string, date: string) => void;
  error: string | null;
}

export function ReflectionInput({
  lastReflectionDate,
  onReflectionCreated,
  error,
}: ReflectionInputProps) {
  const [text, setText] = useState("");
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
      onReflectionCreated(id, today);
    });
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">
          {hasMultiDayGap
            ? `What have you been up to since ${formatDate(coversSince)}?`
            : "What did you do today?"}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Reflect on your actions and progress. Even a sentence or two is fine.
        </p>
      </div>

      <div className="p-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Today I worked on..."
          className="min-h-[140px] resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
          autoFocus
        />
      </div>

      <div className="flex items-center justify-between border-t px-4 py-3">
        <div>
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
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
