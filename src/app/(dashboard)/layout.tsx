import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSystemState } from "@/lib/supabase/cached-queries";
import { TabBar } from "@/components/layout/tab-bar";
import { LockWatcher } from "@/components/layout/lock-watcher";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const systemState = await getSystemState();

  return (
    <div className="flex h-full flex-col">
      <LockWatcher
        initialIsLocked={systemState?.is_locked ?? false}
        initialLastReflectionDate={systemState?.last_reflection_date ?? null}
      />
      <TabBar />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
