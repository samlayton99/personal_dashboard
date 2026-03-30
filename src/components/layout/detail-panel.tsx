"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DetailPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  bannerColor?: string;
}

export function DetailPanel({ open, onClose, title, children, bannerColor }: DetailPanelProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleMouseDown(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={cardRef}
      className="absolute inset-0 z-20 flex flex-col rounded-lg border bg-card shadow-lg"
    >
      <div
        className="flex h-10 shrink-0 items-center justify-between rounded-t-lg px-4"
        style={{ backgroundColor: bannerColor ?? "var(--primary)" }}
      >
        <h2 className="text-sm font-semibold text-primary-foreground">{title}</h2>
        <button
          onClick={onClose}
          className="cursor-pointer rounded p-0.5 text-white/50 transition-colors hover:text-white hover:bg-white/10"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-5">{children}</div>
      </ScrollArea>
    </div>
  );
}
