import Link from "next/link";

export default function HomePage() {
  return (
    <div className="grid gap-10">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-background p-8 shadow-[0_1px_0_0_rgba(0,0,0,0.03),0_30px_90px_-60px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(600px_circle_at_20%_20%,oklch(0.92_0.02_260),transparent_55%),radial-gradient(500px_circle_at_80%_30%,oklch(0.93_0.02_80),transparent_55%)]" />

        <div className="relative grid gap-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            PromptSkiller / Web MVP
          </p>
          <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            把提示词当成一种技能训练，而不是一次性的问答
          </h1>
          <p className="max-w-2xl text-pretty text-sm leading-7 text-muted-foreground sm:text-base">
            每天推荐 2-3 题：写提示词，拿到教练反馈，再迭代一版。默认 Mock
            教练，配置 API Key 后可切换真实模型（可选）。
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/drills/today"
              className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background shadow-sm transition-transform hover:-translate-y-0.5"
            >
              开始今日训练
            </Link>
            <Link
              href="/drills"
              className="inline-flex h-10 items-center justify-center rounded-full border border-border/80 bg-background px-5 text-sm font-medium text-foreground shadow-sm transition-transform hover:-translate-y-0.5"
            >
              浏览题库
            </Link>
            <Link
              href="/settings"
              className="inline-flex h-10 items-center justify-center rounded-full border border-border/80 bg-background px-5 text-sm font-medium text-foreground shadow-sm transition-transform hover:-translate-y-0.5"
            >
              配置 API Key
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-background p-5">
          <p className="text-sm font-medium">训练目标</p>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            让你的描述更清晰、更可执行、更可验收，让 AI 更容易一次做对。
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background p-5">
          <p className="text-sm font-medium">训练方式</p>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            同一题目允许多次提交提示词版本，重点在“迭代”而不是一次给出完美答案。
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background p-5">
          <p className="text-sm font-medium">为什么要 Mock</p>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            先把流程跑通、让产品可用，再接真实模型。Mock 输出结构固定，便于做 UI
            与测试。
          </p>
        </div>
      </section>
    </div>
  );
}
