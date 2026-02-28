"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type State =
  | { kind: "loading" }
  | { kind: "anon" }
  | { kind: "ready"; userId: string; voted: boolean };

export function VoteButtonClient(props: {
  submissionId: string;
  initialVotesCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [votes, setVotes] = useState(props.initialVotesCount);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;

    async function load() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!active) return;
      if (!user) {
        setState({ kind: "anon" });
        return;
      }

      const { data: voteRow, error } = await supabase
        .from("submission_votes")
        .select("id")
        .eq("submission_id", props.submissionId)
        .eq("voter_id", user.id)
        .maybeSingle();

      if (!active) return;
      if (error) {
        setErr(error.message);
        setState({ kind: "ready", userId: user.id, voted: false });
        return;
      }

      setState({ kind: "ready", userId: user.id, voted: Boolean(voteRow) });
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session?.user) setState({ kind: "anon" });
      else setState({ kind: "ready", userId: session.user.id, voted: false });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [props.submissionId]);

  async function onToggleVote() {
    setErr(null);

    if (state.kind === "anon") {
      router.push(`/auth?redirectTo=${encodeURIComponent(pathname || "/challenges")}`);
      return;
    }
    if (state.kind !== "ready") return;

    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();

      if (state.voted) {
        const { error } = await supabase
          .from("submission_votes")
          .delete()
          .eq("submission_id", props.submissionId)
          .eq("voter_id", state.userId);

        if (error) throw error;

        setVotes((v) => Math.max(0, v - 1));
        setState({ ...state, voted: false });
        return;
      }

      const { error } = await supabase.from("submission_votes").insert({
        submission_id: props.submissionId,
        voter_id: state.userId,
      });

      if (error) throw error;

      setVotes((v) => v + 1);
      setState({ ...state, voted: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setErr(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onToggleVote}
        disabled={busy || state.kind === "loading"}
        className={[
          "inline-flex h-9 items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium shadow-sm transition-colors disabled:opacity-50",
          state.kind === "ready" && state.voted
            ? "border-foreground bg-foreground text-background"
            : "border-border/70 bg-background text-foreground hover:bg-muted/30",
        ].join(" ")}
        title={state.kind === "anon" ? "登录后才能投票" : undefined}
      >
        {state.kind === "ready" && state.voted ? "已点赞" : "点赞"}
        <span className="tabular-nums opacity-80">{votes}</span>
      </button>
      {err ? <span className="text-sm text-destructive">{err}</span> : null}
    </div>
  );
}

