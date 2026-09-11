import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DESK_SESSION_COOKIE, DESK_SESSION_VALUE, deskGatePassword } from "./lib/auth";

export function proxy(request: NextRequest) {
  if (!deskGatePassword()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return NextResponse.next();
  }

  if (request.cookies.get(DESK_SESSION_COOKIE)?.value === DESK_SESSION_VALUE) {
    return NextResponse.next();
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|robots.txt).*)"],
};
