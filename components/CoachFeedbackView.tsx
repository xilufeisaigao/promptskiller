"use client";

import { useEffect, useMemo, useState } from "react";

import type { CoachResult } from "@/lib/coach/types";

function ScorePill(props: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background px-3 py-2">
      <span className="text-xs text-muted-foreground">{props.label}</span>
      <span className="text-xs font-semibold tabular-nums">{props.value}/20</span>
    </div>
  );
}

export function CoachFeedbackView(props: { coach: CoachResult }) {
  const f = props.coach.feedback;
  const [missingVisible, setMissingVisible] = useState(0);
  const [ambiguitiesVisible, setAmbiguitiesVisible] = useState(0);
  const [questionsVisible, setQuestionsVisible] = useState(0);
  const [showRewrite, setShowRewrite] = useState(false);
  const [typedChars, setTypedChars] = useState(0);

  const rewriteText = useMemo(() => f.rewrite_example ?? "", [f.rewrite_example]);

  useEffect(() => {
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    f.missing_items.forEach((_, i) => {
      timers.push(
        setTimeout(() => setMissingVisible(i + 1), 80 * (i + 1)),
      );
    });

    const ambiguitiesStart = 100 + f.missing_items.length * 80;
    f.ambiguities.forEach((_, i) => {
      timers.push(
        setTimeout(() => setAmbiguitiesVisible(i + 1), ambiguitiesStart + 80 * (i + 1)),
      );
    });

    const questionsStart = ambiguitiesStart + 100 + f.ambiguities.length * 80;
    f.suggested_questions_to_answer.forEach((_, i) => {
      timers.push(
        setTimeout(() => setQuestionsVisible(i + 1), questionsStart + 80 * (i + 1)),
      );
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [f.missing_items, f.ambiguities, f.suggested_questions_to_answer]);

  useEffect(() => {
    if (!showRewrite || !rewriteText) {
      return;
    }

    const timer = setInterval(() => {
      setTypedChars((prev) => {
        const next = prev + Math.max(1, Math.floor(rewriteText.length / 120));
        if (next >= rewriteText.length) {
          clearInterval(timer);
          return rewriteText.length;
        }
        return next;
      });
    }, 16);

    return () => clearInterval(timer);
  }, [showRewrite, rewriteText]);

  return (
    <div className="grid min-w-0 gap-4 overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">教练反馈</span>
          <span className="rounded-full border border-border/70 bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
            结构化评估
          </span>
        </div>
        <div className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background tabular-nums">
          总分 {f.score_total}/120
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <ScorePill label="上下文" value={f.scores.context} />
        <ScorePill label="约束" value={f.scores.constraints} />
        <ScorePill label="输出格式" value={f.scores.output_format} />
        <ScorePill label="验收标准" value={f.scores.acceptance_criteria} />
        <ScorePill label="测试/边界" value={f.scores.tests_and_edge_cases} />
        <ScorePill label="流程控制" value={f.scores.process_control} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-border/60 bg-background p-4">
          <p className="text-sm font-medium">缺失项</p>
          {f.missing_items.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">不错，没有明显缺失。</p>
          ) : (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
              {f.missing_items.slice(0, missingVisible).map((x, i) => (
                <li key={i} className="break-words">{x}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="min-w-0 rounded-2xl border border-border/60 bg-background p-4">
          <p className="text-sm font-medium">歧义/模糊点</p>
          {f.ambiguities.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              没有检测到明显模糊词（仍建议你自查）。
            </p>
          ) : (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
              {f.ambiguities.slice(0, ambiguitiesVisible).map((x, i) => (
                <li key={i} className="break-words">{x}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="min-w-0 rounded-2xl border border-border/60 bg-background p-4">
        <p className="text-sm font-medium">建议补充回答的问题</p>
        {f.suggested_questions_to_answer.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">暂无。</p>
        ) : (
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6">
            {f.suggested_questions_to_answer.slice(0, questionsVisible).map((x, i) => (
              <li key={i} className="break-words">{x}</li>
            ))}
          </ol>
        )}
      </div>

      <div className="min-w-0 rounded-2xl border border-border/60 bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">提示词参考答案（可选）</p>
          <button
            type="button"
            onClick={() =>
              setShowRewrite((v) => {
                const next = !v;
                setTypedChars(0);
                return next;
              })
            }
            className="inline-flex h-8 items-center justify-center rounded-full border border-border/70 bg-background px-3 text-xs font-medium text-foreground hover:bg-muted/30"
          >
            {showRewrite ? "隐藏参考答案" : "显示参考答案"}
          </button>
        </div>

        {!showRewrite ? (
          <p className="mt-2 text-sm text-muted-foreground">
            先根据上面的反馈自己改一版，再点按钮查看参考答案效果会更好。
          </p>
        ) : f.rewrite_example ? (
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border/60 bg-muted/40 p-3 text-xs leading-5">
            {rewriteText.slice(0, typedChars) || rewriteText}
          </pre>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">本次暂无参考答案。</p>
        )}
      </div>
    </div>
  );
}
