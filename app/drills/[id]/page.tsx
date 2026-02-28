import { notFound } from "next/navigation";

import { DrillPracticeClient } from "@/components/DrillPracticeClient";
import { getDrillById } from "@/lib/content/drills-source";

export const dynamic = "force-dynamic";

export default async function DrillByIdPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const drill = await getDrillById(id);
  if (!drill) notFound();

  return <DrillPracticeClient drill={drill} />;
}
