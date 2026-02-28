import { DrillLibraryClient } from "@/components/DrillLibraryClient";
import { listDrills } from "@/lib/content/drills-source";

export const dynamic = "force-dynamic";

export default async function DrillLibraryPage() {
  const drills = await listDrills();
  return <DrillLibraryClient drills={drills} />;
}

