"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const tabs = [
  { name: "First Principles", href: "/first-principles" },
  { name: "Automations", href: "/automations" },
  { name: "World", href: "/world" },
  { name: "Inbox", href: "/inbox" },
  { name: "Network", href: "/network" },
] as const;

export function TabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <nav className="flex h-11 shrink-0 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-1.5">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-3 py-1 text-sm font-medium rounded-full border transition-colors",
              pathname === tab.href || pathname.startsWith(tab.href + "/")
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {tab.name}
          </Link>
        ))}
      </div>
      <button
        onClick={handleLogout}
        className="cursor-pointer rounded-full border border-transparent px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-border"
      >
        Sign out
      </button>
    </nav>
  );
}
