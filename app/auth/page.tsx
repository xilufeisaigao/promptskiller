import { Suspense } from "react";

import { AuthClient } from "@/components/AuthClient";

export const dynamic = "force-dynamic";

export default function AuthPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">加载中...</p>}
    >
      <AuthClient />
    </Suspense>
  );
}

