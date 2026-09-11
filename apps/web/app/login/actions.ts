"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DESK_SESSION_COOKIE, DESK_SESSION_VALUE, deskGatePassword } from "@/lib/auth";

function safeNext(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value : "/";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

export async function signIn(formData: FormData) {
  const expected = deskGatePassword();
  const next = safeNext(formData.get("next"));
  if (expected && String(formData.get("password") ?? "") !== expected) {
    redirect(`/login?error=bad_password&next=${encodeURIComponent(next)}`);
  }

  const jar = await cookies();
  jar.set(DESK_SESSION_COOKIE, DESK_SESSION_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  redirect(next);
}
