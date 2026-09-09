import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next 16 renamed the `middleware` convention to `proxy`. The function must be
 * named `proxy`, and it runs on the Node.js runtime — the edge runtime is not
 * supported here and setting `runtime` throws.
 *
 * Three jobs:
 *   1. decide which realm a request belongs to, from its hostname;
 *   2. refresh the Supabase session cookie;
 *   3. keep signed-out visitors out of the admin app.
 *
 * (3) is a redirect for good UX, NOT the security boundary. The Next docs are
 * explicit that a matcher change or moving a Server Function to another route
 * can silently remove proxy coverage, so every server action and page also
 * calls `requireStaff()`. Defence in depth, deliberately.
 */

/**
 * One deployment serves two products on two hostnames:
 *
 *   admin.skymilestravels.com -> the internal CRM   (app/(admin))
 *   my.skymilestravels.com    -> the customer portal (app/(portal), /my/*)
 *
 * The file-system routes are unchanged; the portal host is rewritten onto the
 * `/my` prefix so the customer never sees it in the address bar. Keeping one
 * deployment means one build, one set of environment variables, and no shared
 * code duplicated across two projects.
 */
type Realm = "admin" | "portal" | "shared";

/** Local development and Vercel previews have no subdomain to read. */
function realmFor(hostname: string): Realm {
  const host = hostname.toLowerCase().split(":")[0];

  if (host.startsWith("admin.")) return "admin";
  if (host.startsWith("my.")) return "portal";

  // `my.localhost` works in Chrome and Firefox without a hosts-file entry,
  // so the portal can still be exercised locally.
  if (host === "my.localhost") return "portal";
  if (host === "admin.localhost") return "admin";

  // localhost, *.vercel.app, and the apex fall back to path-based routing:
  // `/` is the CRM, `/my` is the portal, exactly as during development.
  return "shared";
}

/** Public within the admin realm. */
const ADMIN_PUBLIC_PREFIXES = ["/login", "/auth", "/q/"];

function isAdminPublic(pathname: string) {
  return ADMIN_PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const realm = realmFor(request.headers.get("host") ?? "");

  // --- Portal host -------------------------------------------------------
  // Rewrite onto the /my prefix so customers get clean URLs, and refuse to
  // serve any admin route from the customer hostname.
  if (realm === "portal") {
    if (pathname.startsWith("/my")) {
      // Already prefixed — usually an internal link. Normalise to the clean
      // URL so only one form of every address exists.
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace(/^\/my/, "") || "/";
      return NextResponse.redirect(url);
    }

    const url = request.nextUrl.clone();
    url.pathname = `/my${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  // --- Admin host --------------------------------------------------------
  // The portal is not reachable from the CRM hostname. Without this, every
  // page would exist at two addresses, which splits sessions and confuses
  // search engines.
  if (realm === "admin" && pathname.startsWith("/my")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Customer-facing routes carry their own access rules and must not be
  // pushed to the staff login screen.
  const isPublic =
    isAdminPublic(pathname) ||
    (realm === "shared" && pathname.startsWith("/my"));

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
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() revalidates the token with Supabase. getSession() only reads the
  // cookie, which a client can forge — never gate on it here.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals and static assets. Without this the
    // redirect would also swallow CSS, JS and images.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
