import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const HR_PORTAL_ROLES = ["hr_admin", "hr_staff", "approver", "viewer", "manager"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ต้องล็อกอินก่อนเข้า /hr/* และ /me/*
  const needsAuth =
    (pathname.startsWith("/hr") && pathname !== "/hr/login") ||
    pathname.startsWith("/me");
  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/hr/login";
    return NextResponse.redirect(url);
  }

  // บัญชีที่ล็อกอินแล้ว: เช็ค role เพื่อพาไปโซนที่ถูกต้อง
  // (พนักงาน ESS ล้วนไม่มีสิทธิ์เข้า /hr — เดิมจะค้างที่หน้า "ไม่มีสิทธิ์" โดยไม่มีทางไปต่อ)
  if (user && (pathname === "/hr/login" || pathname.startsWith("/hr"))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    const isHrPortalUser = !!profile && HR_PORTAL_ROLES.includes(profile.role);

    if (pathname === "/hr/login") {
      const url = request.nextUrl.clone();
      url.pathname = isHrPortalUser ? "/hr" : "/me";
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/hr") && !isHrPortalUser) {
      const url = request.nextUrl.clone();
      url.pathname = "/me";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/hr/:path*", "/me/:path*"],
};
