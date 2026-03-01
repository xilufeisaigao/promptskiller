import { notFound } from "next/navigation";

import { DrillPracticeClient } from "@/components/DrillPracticeClient";
import { getDrillById, listDrillAssets } from "@/lib/content/drills-source";

export const dynamic = "force-dynamic";

export default async function DrillByIdPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const drill = await getDrillById(id);
  if (!drill) notFound();
  const assets = await listDrillAssets(id);

  return <DrillPracticeClient drill={drill} assets={assets} />;
}
