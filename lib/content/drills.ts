export type Drill = {
  id: string;
  displayNo: number;
  title: string;
  bodyMd: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  drillType: DrillType;
  tags?: string[];
  publishedAt?: string | null;
};

export type DrillType = "prompt_case" | "code_case_multi" | "build_sim_case" | "template_case";

export type DrillAssetKind = "file" | "log" | "spec";

export type DrillAsset = {
  id: string;
  drillId: string;
  assetKind: DrillAssetKind;
  path: string;
  contentText: string;
  orderNo: number;
};

export type DrillTemplateRound = {
  id: string;
  drillId: string;
  roundNo: number;
  versionLabel: string;
  promptText: string;
  teachingNotesMd: string | null;
};

export type DrillModuleLevel = "starter" | "intermediate" | "advanced";

export type DrillModule = {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: DrillModuleLevel;
  estimatedMinutes: number | null;
  coverStyle: string | null;
  publishedAt: string | null;
  drillIds: string[];
};

// Keep this list small for MVP. We can later move drills into Supabase.
export const DRILLS: Drill[] = [
  {
    id: "drill-debug-minimal-repro",
    displayNo: 1,
    title: "把 Bug 描述成可复现的最小问题",
    difficulty: 2,
    drillType: "prompt_case",
    tags: ["debug", "communication"],
    bodyMd: [
      "你遇到一个 bug：某个表单提交后页面偶尔会卡死，刷新才恢复。",
      "",
      "约束：",
      "- 你不能贴出任何公司机密、账号密码、API key。",
      "- 你要让 AI 能一步步定位问题，所以需要给出复现步骤、期望结果、实际结果、环境信息。",
      "",
      "目标：",
      "- 写一段你会发给 AI 的提示词，让 AI 先提出澄清问题，再给出排查路径。",
      "",
      "提示：你可以要求 AI 输出一个排查 checklist，以及你应该补充的日志/截图/信息。",
    ].join("\n"),
  },
  {
    id: "drill-write-tests",
    displayNo: 2,
    title: "让 AI 写测试之前先把验收标准讲清楚",
    difficulty: 3,
    drillType: "prompt_case",
    tags: ["testing", "spec"],
    bodyMd: [
      "场景：你有一个函数 `parsePrice(input: string)`，输入类似 '12.30' 或 '$12.30'，输出 number。",
      "",
      "约束：",
      "- 不考虑国际化（只考虑 '.' 小数点）。",
      "- 遇到非法输入要抛出错误。",
      "",
      "目标：",
      "- 写提示词让 AI 先列出边界情况，再生成单元测试用例（不要直接给实现）。",
      "",
      "你要明确：哪些算合法，哪些算非法，错误信息是否需要固定等。",
    ].join("\n"),
  },
  {
    id: "drill-refactor-with-constraints",
    displayNo: 3,
    title: "要求重构但保持行为不变（并给出验证方式）",
    difficulty: 4,
    drillType: "prompt_case",
    tags: ["refactor", "quality"],
    bodyMd: [
      "场景：你有一段“能跑但很丑”的业务逻辑代码，你希望 AI 帮你重构，让它：",
      "- 更易读",
      "- 更容易测试",
      "- 更少副作用",
      "",
      "约束：",
      "- 行为必须不变（包含边界情况）。",
      "- 需要先给重构计划，再给代码。",
      "- 需要提供验证方案（比如测试策略）。",
      "",
      "目标：",
      "- 写一段提示词，要求 AI 先问清楚输入输出与边界，再给分步重构方案。",
    ].join("\n"),
  },
  {
    id: "drill-api-design",
    displayNo: 4,
    title: "设计一个 API：把需求拆成接口 + 数据结构",
    difficulty: 4,
    drillType: "prompt_case",
    tags: ["api", "design"],
    bodyMd: [
      "场景：你要做一个“每日训练题”功能，需要：",
      "- 获取今日训练题",
      "- 提交一次尝试（prompt + coach feedback）",
      "- 获取某题的历史尝试",
      "",
      "目标：",
      "- 写提示词让 AI 输出：REST API 设计（路径、方法、请求/响应 body）、数据表草案、以及 RLS 关键点。",
      "",
      "约束：",
      "- 输出必须是 Markdown，并且每个接口都要有示例请求/响应 JSON。",
    ].join("\n"),
  },
  {
    id: "drill-acceptance-criteria",
    displayNo: 5,
    title: "把“我要一个页面”讲成可验收的任务",
    difficulty: 2,
    drillType: "prompt_case",
    tags: ["frontend", "spec"],
    bodyMd: [
      "场景：你要让 AI 帮你做一个简单页面，但你发现你经常只说“做个页面”，结果越做越偏。",
      "",
      "目标：",
      "- 写提示词，要求 AI 先复述需求，再输出一个验收标准清单，然后再开始产出页面代码。",
      "",
      "提示：你可以指定布局、交互状态、移动端适配、无障碍（a11y）等。",
    ].join("\n"),
  },
];

export const DRILL_MODULES: DrillModule[] = [
  {
    id: "module-debug-fundamentals",
    slug: "debug-fundamentals",
    title: "Debug Fundamentals",
    description:
      "从最小复现、日志补齐到排查路径表达，建立稳定的调试提示词能力。",
    level: "starter",
    estimatedMinutes: 35,
    coverStyle: "sand-grid",
    publishedAt: null,
    drillIds: [
      "drill-debug-minimal-repro",
      "drill-write-tests",
      "drill-acceptance-criteria",
    ],
  },
  {
    id: "module-prompt-api-design",
    slug: "prompt-api-design",
    title: "Prompt for API Design",
    description:
      "围绕 API 拆解、数据结构和权限约束，训练可交付的接口设计表达。",
    level: "intermediate",
    estimatedMinutes: 45,
    coverStyle: "ocean-line",
    publishedAt: null,
    drillIds: [
      "drill-api-design",
      "drill-write-tests",
      "drill-refactor-with-constraints",
    ],
  },
  {
    id: "module-code-refactor-lab",
    slug: "code-refactor-lab",
    title: "Code Refactor Lab",
    description:
      "聚焦多文件联调、行为等价重构和模拟构建协作，面向真实工程场景。",
    level: "advanced",
    estimatedMinutes: 60,
    coverStyle: "graph-grid",
    publishedAt: null,
    drillIds: [
      "drill-refactor-with-constraints",
      "drill-api-design",
      "drill-write-tests",
    ],
  },
];

export function getDrillById(id: string): Drill | undefined {
  return DRILLS.find((d) => d.id === id);
}

export function getDrillForDate(date: Date): Drill {
  const idx = Math.abs(
    date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate(),
  );

  return DRILLS[idx % DRILLS.length]!;
}

export function getDrillForUtcDate(date: Date): Drill {
  const idx = Math.abs(
    date.getUTCFullYear() * 10000 +
      (date.getUTCMonth() + 1) * 100 +
      date.getUTCDate(),
  );
  return DRILLS[idx % DRILLS.length]!;
}
