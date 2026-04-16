import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { shouldTriggerLock } from "@/lib/utils/lock";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in — redirect to login (except login page and agent API)
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/api/agents")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Logged in but wrong user — sign out and redirect to login with error
  const allowedEmail = process.env.ALLOWED_EMAIL;
  if (user && allowedEmail && user.email !== allowedEmail) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(url);
  }

  // Lock check + trigger: runs server-side on every navigation so lock
  // fires even if client JS hasn't hydrated yet.
  const pathname = request.nextUrl.pathname;
  if (
    user &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/api")
  ) {
    const { data: systemState } = await supabase
      .from("system_state")
      .select("is_locked, last_reflection_date")
      .eq("id", 1)
      .single();

    const isLocked = systemState?.is_locked;

    // Trigger lock if overdue (missed nights, etc.)
    if (!isLocked && shouldTriggerLock(systemState?.last_reflection_date ?? null)) {
      await supabase
        .from("system_state")
        .update({ is_locked: true, locked_at: new Date().toISOString() })
        .eq("id", 1);

      if (!pathname.startsWith("/first-principles")) {
        const url = request.nextUrl.clone();
        url.pathname = "/first-principles";
        return NextResponse.redirect(url);
      }
    }

    // Already locked — enforce redirect
    if (isLocked && !pathname.startsWith("/first-principles")) {
      const url = request.nextUrl.clone();
      url.pathname = "/first-principles";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
