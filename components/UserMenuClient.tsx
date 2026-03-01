"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthState =
  | { kind: "loading" }
  | { kind: "anon" }
  | { kind: "authed"; email: string | null; isAdmin: boolean };

export function UserMenuClient() {
  const [state, setState] = useState<AuthState>({ kind: "loading" });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;

    async function loadAuthedState(session: { user: { id: string; email?: string | null } } | null) {
      if (!active) return;
      if (!session) {
        setState({ kind: "anon" });
        return;
      }

      const email = session.user.email ?? null;
      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!active) return;
      const isAdmin = !error && Boolean((data as { is_admin?: boolean } | null)?.is_admin);
      setState({ kind: "authed", email, isAdmin });
    }

    supabase.auth.getSession().then(({ data }) => {
      const session = data.session
        ? { user: { id: data.session.user.id, email: data.session.user.email } }
        : null;
      void loadAuthedState(session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session
        ? { user: { id: session.user.id, email: session.user.email } }
        : null;
      void loadAuthedState(next);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
  }

  if (state.kind === "loading") {
    return (
      <div className="rounded-full border border-border/70 bg-background px-3 py-1 text-[11px] text-muted-foreground">
        …
      </div>
    );
  }

  if (state.kind === "anon") {
    return (
      <Link
        href="/auth"
        className="rounded-full border border-border/70 bg-background px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        登录
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {state.isAdmin ? (
        <Link
          href="/admin"
          className="rounded-full border border-border/70 bg-background px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          后台
        </Link>
      ) : null}
      <Link
        href="/profile"
        className="rounded-full border border-border/70 bg-background px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        title={state.email ?? undefined}
      >
        {state.email ? state.email : "已登录"}
      </Link>
      <button
        type="button"
        onClick={onSignOut}
        className="rounded-full border border-border/70 bg-background px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        退出
      </button>
    </div>
  );
}
