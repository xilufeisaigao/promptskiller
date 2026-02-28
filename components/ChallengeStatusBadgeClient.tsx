"use client";

import { useEffect, useState } from "react";

type Status = "未开始" | "进行中" | "已结束";

export function ChallengeStatusBadgeClient(props: {
  startAt: string;
  endAt: string;
}) {
  const [status, setStatus] = useState<Status>("进行中");

  useEffect(() => {
    const start = new Date(props.startAt).getTime();
    const end = new Date(props.endAt).getTime();

    function compute() {
      const now = Date.now();
      if (now < start) setStatus("未开始");
      else if (now > end) setStatus("已结束");
      else setStatus("进行中");
    }

    compute();
    const t = window.setInterval(compute, 60_000);
    return () => window.clearInterval(t);
  }, [props.startAt, props.endAt]);

  return (
    <span className="rounded-full border border-border/70 bg-muted/20 px-3 py-1 text-[11px] text-muted-foreground">
      {status}
    </span>
  );
}

