// Admin allowlist — Pattern 2/3 hybrid per _config/guides/auth-middleware.md.
// Middleware only guards /admin with a session check (edge runtime, no DB);
// the allowlist check itself lives in the (admin) layout and here, for
// every /api/admin/* route.
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

function allowedEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return allowedEmails().includes(email.toLowerCase());
}

/** Resolve the signed-in user if they're on the admin allowlist, or null.
 *  Every /api/admin/* route must check this before touching the service
 *  client — RLS doesn't gate admin writes, this is the only gate. */
export async function getAuthedAdmin(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return null;
  return user;
}
