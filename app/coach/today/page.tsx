import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CoachTodayPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (!value || key === "mode") continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else {
      params.set(key, value);
    }
  }
  params.set("mode", "coach");
  redirect(`/drills/today?${params.toString()}`);
}
