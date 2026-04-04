// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client (browser)
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON);

// Server-side Supabase client (API routes / Server Components)
export function createServerClient() {
  return createClient<Database>(
    SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_ANON,
    { auth: { persistSession: false } }
  );
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getShopUser() {
  const session = await getSession();
  if (!session) return null;
  const { data } = await supabase
    .from("shop_users")
    .select("*, shops(*)")
    .eq("auth_id", session.user.id)
    .single();
  return data;
}

export async function signIn(username: string, password: string) {
  // Look up email by username from shop_users
  const { data: users } = await supabase
    .from("shop_users")
    .select("auth_id, username")
    .eq("username", username)
    .eq("active", true)
    .single();

  if (!users) throw new Error("بيانات الدخول غير صحيحة");

  // Sign in with Supabase Auth (email = auth_id@shop.local)
  const fakeEmail = `${users.auth_id}@topclean.local`;
  const { data, error } = await supabase.auth.signInWithPassword({
    email: fakeEmail,
    password,
  });
  if (error) throw new Error("بيانات الدخول غير صحيحة");
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}
