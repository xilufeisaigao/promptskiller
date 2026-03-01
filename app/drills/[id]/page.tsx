import { notFound } from "next/navigation";

import { DrillPracticeClient } from "@/components/DrillPracticeClient";
import { TemplateDrillBoardClient } from "@/components/TemplateDrillBoardClient";
import {
  getDrillById,
  listDrillAssets,
  listDrillTemplateRounds,
} from "@/lib/content/drills-source";

export const dynamic = "force-dynamic";

export default async function DrillByIdPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const drill = await getDrillById(id);
  if (!drill) notFound();
  const assets = await listDrillAssets(id);
  const templateRounds =
    drill.drillType === "template_case"
      ? await listDrillTemplateRounds(id)
      : [];

  if (drill.drillType === "template_case") {
    return (
      <TemplateDrillBoardClient
        drill={drill}
        assets={assets}
        rounds={templateRounds}
      />
    );
  }

  return <DrillPracticeClient drill={drill} assets={assets} />;
}
