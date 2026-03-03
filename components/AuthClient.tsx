"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "signin" | "signup";

export function AuthClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = useMemo(
    () => searchParams.get("redirectTo") || "/coach/today",
    [searchParams],
  );

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit() {
    setMsg(null);
    setBusy(true);

    try {
      const supabase = getSupabaseBrowserClient();
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (!data.session) {
          setMsg("登录未返回 session（可能需要邮箱验证或项目配置限制）");
          return;
        }
        router.push(redirectTo);
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      // Depending on Supabase auth settings, session may be null until email is confirmed.
      if (!data.session) {
        setMsg("注册成功：请检查邮箱完成验证，然后再登录。");
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setMsg(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-3xl border border-border/60 bg-background p-6 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "signin" ? "登录" : "注册"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              登录后可把训练记录写入数据库，并参加周赛提交与投票。
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-border/70 bg-muted/20 p-1 text-xs">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={[
                "rounded-full px-3 py-1 transition-colors",
                mode === "signin"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={[
                "rounded-full px-3 py-1 transition-colors",
                mode === "signup"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              注册
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <div className="grid gap-2">
            <label className="text-sm font-medium">邮箱</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm outline-none ring-offset-background placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring"
              inputMode="email"
              autoComplete="email"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">密码</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6-8 位（取决于你的 Supabase 配置）"
              type="password"
              className="h-11 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm outline-none ring-offset-background placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>

          <button
            type="button"
            onClick={onSubmit}
            disabled={busy || !email.trim() || !password}
            className="mt-2 inline-flex h-11 items-center justify-center rounded-2xl bg-foreground px-5 text-sm font-medium text-background shadow-sm disabled:opacity-50"
          >
            {busy ? "处理中..." : mode === "signin" ? "登录" : "注册"}
          </button>

          {msg ? (
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 text-sm">
              {msg}
            </div>
          ) : null}

          <p className="text-xs leading-6 text-muted-foreground">
            提示：如果你开启了邮箱验证，注册后需要先验证邮箱才能登录并获得 session。
          </p>
        </div>
      </div>
    </div>
  );
}
