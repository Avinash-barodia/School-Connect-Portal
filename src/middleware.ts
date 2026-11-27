import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { routeAccessMap } from "./lib/settings";
import { isValidRole } from "./lib/auth";
import { NextResponse } from "next/server";

const matchers = Object.keys(routeAccessMap).map((route) => ({
  matcher: createRouteMatcher([route]),
  allowedRoles: routeAccessMap[route],
}));

const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware((auth, req) => {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: unknown } | undefined)?.role;

  if (isApiRoute(req)) {
    if (!userId || !isValidRole(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  for (const { matcher, allowedRoles } of matchers) {
    if (matcher(req)) {
      if (!userId || !isValidRole(role)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      if (!allowedRoles.includes(role)) {
        return NextResponse.redirect(new URL(`/${role}`, req.url));
      }
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
