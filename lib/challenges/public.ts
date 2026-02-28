import { createSupabasePublicClient } from "@/lib/supabase/public";

export type WeeklyChallenge = {
  id: string;
  slug: string;
  title: string;
  bodyMd: string;
  startAt: string;
  endAt: string;
  createdAt: string;
};

export type ChallengeSubmission = {
  id: string;
  challengeId: string;
  userId: string;
  artifactUrl: string;
  artifactType: string;
  promptLogMd: string;
  notes: string | null;
  votesCount: number;
  createdAt: string;
  updatedAt: string;
};

type WeeklyChallengeRow = {
  id: string;
  slug: string;
  title: string;
  body_md: string;
  start_at: string;
  end_at: string;
  created_at: string;
};

type ChallengeSubmissionRow = {
  id: string;
  challenge_id: string;
  user_id: string;
  artifact_url: string;
  artifact_type: string;
  prompt_log_md: string;
  notes: string | null;
  votes_count: number;
  created_at: string;
  updated_at: string;
};

function mapChallenge(row: WeeklyChallengeRow): WeeklyChallenge {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    bodyMd: row.body_md,
    startAt: row.start_at,
    endAt: row.end_at,
    createdAt: row.created_at,
  };
}

function mapSubmission(row: ChallengeSubmissionRow): ChallengeSubmission {
  return {
    id: row.id,
    challengeId: row.challenge_id,
    userId: row.user_id,
    artifactUrl: row.artifact_url,
    artifactType: row.artifact_type,
    promptLogMd: row.prompt_log_md,
    notes: row.notes,
    votesCount: Number(row.votes_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listWeeklyChallenges(): Promise<WeeklyChallenge[]> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("weekly_challenges")
    .select("id, slug, title, body_md, start_at, end_at, created_at")
    .order("start_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r) => mapChallenge(r as WeeklyChallengeRow));
}

export async function getWeeklyChallengeBySlug(
  slug: string,
): Promise<WeeklyChallenge | null> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("weekly_challenges")
    .select("id, slug, title, body_md, start_at, end_at, created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapChallenge(data as WeeklyChallengeRow);
}

export async function getWeeklyChallengeById(
  id: string,
): Promise<WeeklyChallenge | null> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("weekly_challenges")
    .select("id, slug, title, body_md, start_at, end_at, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapChallenge(data as WeeklyChallengeRow);
}

export async function listSubmissionsForChallenge(
  challengeId: string,
): Promise<ChallengeSubmission[]> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("challenge_submissions")
    .select(
      "id, challenge_id, user_id, artifact_url, artifact_type, prompt_log_md, notes, votes_count, created_at, updated_at",
    )
    .eq("challenge_id", challengeId)
    .order("votes_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r) => mapSubmission(r as ChallengeSubmissionRow));
}

export async function getSubmissionById(
  id: string,
): Promise<ChallengeSubmission | null> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("challenge_submissions")
    .select(
      "id, challenge_id, user_id, artifact_url, artifact_type, prompt_log_md, notes, votes_count, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapSubmission(data as ChallengeSubmissionRow);
}
