import Link from "next/link";
import { listDrillModules } from "@/lib/content/drills-source";

export default async function HomePage() {
  const modules = (await listDrillModules()).slice(0, 3);
  const workflow = [
    {
      step: "01",
      title: "选题开始",
      desc: "从今日推荐或题库选一题，先明确目标与边界，再动手写 prompt。",
    },
    {
      step: "02",
      title: "结构化提交",
      desc: "把背景、约束、输出格式、验收标准写完整，避免“拍脑袋式提问”。",
    },
    {
      step: "03",
      title: "拿到反馈",
      desc: "查看总分与维度分，重点看缺失项、歧义点和建议补充问题。",
    },
    {
      step: "04",
      title: "再迭代一版",
      desc: "按反馈改写后再次提交，形成稳定可复用的提示词模板。",
    },
  ];

  const valueCards = [
    {
      title: "可复盘",
      desc: "每次训练都形成历史版本，便于比较“第一次提交”和“优化后提交”。",
    },
    {
      title: "可量化",
      desc: "评分维度固定，能清楚看到自己在上下文、约束、验收标准上的进步曲线。",
    },
    {
      title: "可迁移",
      desc: "一题一练的能力可以迁移到代码评审、需求拆解、测试设计等真实工作流。",
    },
  ];

  return (
    <div className="grid gap-12 pb-2">
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-border/60 bg-[linear-gradient(135deg,oklch(0.99_0.01_95),oklch(0.975_0.02_230))] p-7 shadow-[0_2px_0_0_rgba(0,0,0,0.03),0_50px_120px_-65px_rgba(0,0,0,0.4)] sm:p-10">
        <div className="pointer-events-none absolute -top-24 right-[-8rem] h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,oklch(0.79_0.12_62/.35),transparent_68%)] blur-2xl" />
        <div className="pointer-events-none absolute bottom-[-9rem] left-[-8rem] h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,oklch(0.82_0.1_220/.3),transparent_70%)] blur-2xl" />
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:38px_38px]" />

        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] lg:items-end">
          <div className="grid gap-5">
            <p className="inline-flex w-fit items-center rounded-full border border-foreground/15 bg-background/70 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase backdrop-blur">
              PromptSkiller / Prompt Workout Studio
            </p>
            <h1 className="max-w-3xl text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              把提示词变成
              <span className="bg-[linear-gradient(100deg,oklch(0.42_0.11_46),oklch(0.47_0.12_230))] bg-clip-text text-transparent">
                可训练、可迭代、可验证
              </span>
              的日常能力
            </h1>
            <p className="max-w-2xl text-pretty text-sm leading-7 text-muted-foreground sm:text-base">
              不追求“一次写对”，而是通过固定训练流程，让你逐步形成高质量 Prompt
              的表达习惯：目标明确、约束完整、输出可验收。
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/coach/today"
                className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background shadow-[0_10px_30px_-18px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5"
              >
                教练模式开始训练
              </Link>
              <Link
                href="/coach"
                className="inline-flex h-11 items-center justify-center rounded-full border border-border/80 bg-background/85 px-6 text-sm font-medium text-foreground shadow-sm transition-transform hover:-translate-y-0.5"
              >
                教练模式题库
              </Link>
              <Link
                href="/exam"
                className="inline-flex h-11 items-center justify-center rounded-full border border-border/80 bg-background/85 px-6 text-sm font-medium text-foreground shadow-sm transition-transform hover:-translate-y-0.5"
              >
                进入考试模式
              </Link>
              <Link
                href="/challenges"
                className="inline-flex h-11 items-center justify-center rounded-full border border-border/80 bg-background/85 px-6 text-sm font-medium text-foreground shadow-sm transition-transform hover:-translate-y-0.5"
              >
                查看周赛
              </Link>
            </div>
          </div>

          <aside className="rounded-3xl border border-border/70 bg-background/80 p-5 backdrop-blur">
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              今日行动清单
            </p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">建议时长</p>
                <p className="mt-1 text-xl font-semibold tracking-tight">20-30 分钟</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">完成标准</p>
                <p className="mt-1 text-sm leading-6">
                  同一题至少提交
                  <span className="font-semibold text-foreground"> 2 个版本</span>并做对比。
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">训练重点</p>
                <p className="mt-1 text-sm leading-6">
                  先补全约束与验收标准，再追求“更聪明”的技巧。
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {valueCards.map((item) => (
          <article
            key={item.title}
            className="rounded-3xl border border-border/60 bg-background p-5 shadow-[0_18px_45px_-45px_rgba(0,0,0,0.6)]"
          >
            <p className="text-sm font-semibold tracking-tight">{item.title}</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.desc}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-border/60 bg-background p-6 shadow-[0_20px_55px_-48px_rgba(0,0,0,0.65)] sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              标准训练流
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              每次训练都按同一条路径走
            </h2>
          </div>
          <Link
            href="/coach/today"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            进入今日训练
          </Link>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          {workflow.map((item) => (
            <article
              key={item.step}
              className="relative overflow-hidden rounded-2xl border border-border/60 bg-[linear-gradient(170deg,oklch(0.995_0_0),oklch(0.975_0.01_180))] p-4"
            >
              <span className="text-xs font-semibold tracking-[0.14em] text-muted-foreground">
                STEP {item.step}
              </span>
              <h3 className="mt-2 text-sm font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-background p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              MODULES · BETA
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              学习模块入口（已上线 Beta）
            </h2>
          </div>
          <Link
            href="/drills?mode=coach&view=modules"
            className="rounded-full border border-border/70 bg-background px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            打开模块视图
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {modules.map((module) => (
            <article
              key={module.id}
              className="rounded-2xl border border-border/60 bg-muted/20 p-4"
            >
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                {module.level.toUpperCase()}
              </p>
              <p className="mt-1 text-sm font-semibold">{module.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {module.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Link
          href="/coach/today"
          className="group rounded-3xl border border-border/60 bg-background p-5 transition-transform hover:-translate-y-0.5"
        >
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            DAILY DRILLS
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">今日训练</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            每日推荐 3 题，任选一题进入练习区并持续迭代版本。
          </p>
          <p className="mt-4 text-sm font-medium text-foreground group-hover:underline">
            去训练
          </p>
        </Link>

        <Link
          href="/coach"
          className="group rounded-3xl border border-border/60 bg-background p-5 transition-transform hover:-translate-y-0.5"
        >
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            LIBRARY
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">题库浏览</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            按题号、标题和标签检索训练题，构建你自己的练习清单。
          </p>
          <p className="mt-4 text-sm font-medium text-foreground group-hover:underline">
            去题库
          </p>
        </Link>

        <Link
          href="/settings"
          className="group rounded-3xl border border-border/60 bg-background p-5 transition-transform hover:-translate-y-0.5"
        >
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            MODEL SETTINGS
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">模型配置</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            可接入 OpenAI、百炼或兼容网关，按你的环境切换在线模型反馈。
          </p>
          <p className="mt-4 text-sm font-medium text-foreground group-hover:underline">
            去配置
          </p>
        </Link>
      </section>
    </div>
  );
}
