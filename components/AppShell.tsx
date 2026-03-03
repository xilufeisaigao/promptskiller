import Link from "next/link";

import { UserMenuClient } from "@/components/UserMenuClient";

export function AppShell(props: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(1200px_circle_at_20%_0%,oklch(0.985_0_0),transparent_55%),radial-gradient(900px_circle_at_90%_20%,oklch(0.97_0_0),transparent_50%),linear-gradient(to_bottom,oklch(0.99_0_0),oklch(0.985_0_0))] text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1900px] items-center justify-between px-4 py-3 lg:px-6">
          <Link href="/" className="group inline-flex items-baseline gap-2">
            <span className="text-sm font-semibold tracking-tight">
              PromptSkiller
            </span>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              prompt workout
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/coach/today"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              教练训练
            </Link>
            <Link
              href="/coach"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              教练题库
            </Link>
            <Link
              href="/exam"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              考试模式
            </Link>
            <Link
              href="/challenges"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              周赛
            </Link>
            <Link
              href="/settings"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              配置
            </Link>
            <UserMenuClient />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1900px] px-4 py-10 lg:px-6">
        {props.children}
      </main>

      <footer className="mx-auto w-full max-w-[1900px] px-4 pb-10 text-xs text-muted-foreground lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-6">
          <p>© {new Date().getFullYear()} PromptSkiller</p>
          <p className="text-[11px]">
            支持本地练习与在线模型接入。
          </p>
        </div>
      </footer>
    </div>
  );
}
