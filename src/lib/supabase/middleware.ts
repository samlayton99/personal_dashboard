import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // Lock check: if dashboard is locked, force user to /first-principles
  const pathname = request.nextUrl.pathname;
  if (
    user &&
    !pathname.startsWith("/first-principles") &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/api")
  ) {
    const { data: systemState } = await supabase
      .from("system_state")
      .select("is_locked")
      .eq("id", 1)
      .single();

    if (systemState?.is_locked) {
      const url = request.nextUrl.clone();
      url.pathname = "/first-principles";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
