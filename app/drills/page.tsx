import { DrillLibraryClient } from "@/components/DrillLibraryClient";
import { listDrillModules, listDrills } from "@/lib/content/drills-source";

export const dynamic = "force-dynamic";

export default async function DrillLibraryPage(props: {
  searchParams: Promise<{ view?: string; module?: string }>;
}) {
  const searchParams = await props.searchParams;
  const drills = await listDrills();
  const modules = await listDrillModules();
  const recentSince = new Date();
  recentSince.setUTCDate(recentSince.getUTCDate() - 14);
  const recentSinceIso = recentSince.toISOString();
  return (
    <DrillLibraryClient
      drills={drills}
      modules={modules}
      recentSinceIso={recentSinceIso}
      initialView={searchParams.view === "modules" ? "modules" : "library"}
      initialModuleSlug={(searchParams.module || "").trim()}
    />
  );
}
