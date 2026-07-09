import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
  if (pathname === "/hr/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/hr";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/hr/:path*", "/me/:path*"],
};
