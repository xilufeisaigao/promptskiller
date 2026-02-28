"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthState =
  | { kind: "loading" }
  | { kind: "anon" }
  | { kind: "authed"; email: string | null };

export function UserMenuClient() {
  const [state, setState] = useState<AuthState>({ kind: "loading" });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email ?? null;
      setState(data.session ? { kind: "authed", email } : { kind: "anon" });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email ?? null;
      setState(session ? { kind: "authed", email } : { kind: "anon" });
    });

    return () => {
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

