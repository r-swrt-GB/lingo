import { supabase } from "./supabase";

export type Word = { id: string; target: string; english: string };
export type Role = "owner" | "editor" | "viewer";
export type Language = {
  id: string;
  name: string;
  words: Word[];
  highScore: number;
  isPublic: boolean;
  userId: string;
  createdBy: string;
  myRole: Role;
};

type DbLanguage = {
  id: string;
  name: string;
  high_score: number;
  is_public: boolean;
  user_id: string;
  words: { id: string; target: string; english: string }[];
};

function mapLanguage(row: DbLanguage, createdBy: string, myRole: Role): Language {
  return {
    id: row.id,
    name: row.name,
    highScore: row.high_score,
    isPublic: row.is_public,
    userId: row.user_id,
    createdBy,
    myRole,
    words: row.words ?? [],
  };
}

type ProfileInfo = { email: string; username: string };

async function profilesByUserId(userIds: string[]): Promise<Map<string, ProfileInfo>> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return new Map();
  const { data } = await supabase.from("profiles").select("id, email, username").in("id", unique);
  return new Map(
    (data ?? []).map((p) => [
      p.id as string,
      { email: (p.email as string) ?? "", username: (p.username as string) ?? "" },
    ]),
  );
}

// Roles I hold across all languages, keyed by language id (excludes ownership).
async function myMemberRoles(userId: string): Promise<Map<string, Role>> {
  const { data } = await supabase
    .from("language_members")
    .select("language_id, role")
    .eq("user_id", userId);
  return new Map((data ?? []).map((m) => [m.language_id as string, m.role as Role]));
}

function resolveRole(ownerId: string, languageId: string, me: string, roles: Map<string, Role>): Role {
  if (ownerId === me) return "owner";
  return roles.get(languageId) ?? "viewer";
}

async function getUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return user.id;
}

export async function getLanguages(): Promise<Language[]> {
  const me = await getUserId();
  const { data, error } = await supabase
    .from("languages")
    .select("id, name, high_score, is_public, user_id, words(id, target, english)")
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = data as DbLanguage[];
  const [profiles, roles] = await Promise.all([
    profilesByUserId(rows.map((r) => r.user_id)),
    myMemberRoles(me),
  ]);
  return rows.map((r) =>
    mapLanguage(r, profiles.get(r.user_id)?.username ?? "Unknown", resolveRole(r.user_id, r.id, me, roles)),
  );
}

export async function getLanguage(id: string): Promise<Language | undefined> {
  const me = await getUserId();
  const { data, error } = await supabase
    .from("languages")
    .select("id, name, high_score, is_public, user_id, words(id, target, english)")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return undefined;
    throw error;
  }
  const row = data as DbLanguage;
  const [profiles, roles] = await Promise.all([profilesByUserId([row.user_id]), myMemberRoles(me)]);
  return mapLanguage(row, profiles.get(row.user_id)?.username ?? "Unknown", resolveRole(row.user_id, row.id, me, roles));
}

export async function addLanguage(name: string, isPublic: boolean): Promise<Language> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("languages")
    .insert({ name: name.trim(), user_id: userId, is_public: isPublic })
    .select("id, name, high_score, is_public, user_id")
    .single();
  if (error) throw error;
  const profiles = await profilesByUserId([userId]);
  return {
    id: data.id,
    name: data.name,
    highScore: data.high_score,
    isPublic: data.is_public,
    userId: data.user_id,
    createdBy: profiles.get(userId)?.username ?? "You",
    myRole: "owner",
    words: [],
  };
}

export async function deleteLanguage(id: string): Promise<void> {
  const { error } = await supabase.from("languages").delete().eq("id", id);
  if (error) throw error;
}

export async function addWord(languageId: string, target: string, english: string): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from("words")
    .insert({ language_id: languageId, user_id: userId, target: target.trim(), english: english.trim() });
  if (error) throw error;
}

export async function addWords(
  languageId: string,
  words: { target: string; english: string }[],
): Promise<void> {
  if (words.length === 0) return;
  const userId = await getUserId();
  const rows = words.map((w) => ({
    language_id: languageId,
    user_id: userId,
    target: w.target.trim(),
    english: w.english.trim(),
  }));
  const { error } = await supabase.from("words").insert(rows);
  if (error) throw error;
}

export async function deleteWord(wordId: string): Promise<void> {
  const { error } = await supabase.from("words").delete().eq("id", wordId);
  if (error) throw error;
}

export type UserSearchResult = { id: string; email: string; username: string };

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const me = await getUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, username")
    .ilike("email", `%${q}%`)
    .neq("id", me)
    .limit(8);
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id as string,
    email: (p.email as string) ?? "",
    username: (p.username as string) ?? "",
  }));
}

export type Member = { userId: string; email: string; username: string; role: Exclude<Role, "owner"> };

export async function getMembers(languageId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from("language_members")
    .select("user_id, role")
    .eq("language_id", languageId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  const profiles = await profilesByUserId(rows.map((m) => m.user_id as string));
  return rows.map((m) => {
    const p = profiles.get(m.user_id as string);
    return {
      userId: m.user_id as string,
      email: p?.email ?? "",
      username: p?.username ?? "",
      role: m.role as Exclude<Role, "owner">,
    };
  });
}

export async function setMember(
  languageId: string,
  userId: string,
  role: Exclude<Role, "owner">,
): Promise<void> {
  const me = await getUserId();
  const { error } = await supabase
    .from("language_members")
    .upsert(
      { language_id: languageId, user_id: userId, role, invited_by: me },
      { onConflict: "language_id,user_id" },
    );
  if (error) throw error;
}

export async function removeMember(languageId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("language_members")
    .delete()
    .eq("language_id", languageId)
    .eq("user_id", userId);
  if (error) throw error;
}

export type Profile = { email: string; username: string };

export async function isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
  let query = supabase.from("profiles").select("id").ilike("username", username.trim());
  if (excludeUserId) query = query.neq("id", excludeUserId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function getProfile(): Promise<Profile> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  const { data } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  const username =
    data?.username ??
    (user.user_metadata?.username as string | undefined) ??
    (user.email ?? "").split("@")[0];
  return { email: user.email ?? "", username };
}

export async function updateUsername(username: string): Promise<void> {
  const trimmed = username.trim();
  const userId = await getUserId();
  if (await isUsernameTaken(trimmed, userId)) throw new Error("That username is already taken.");

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, username: trimmed, updated_at: new Date().toISOString() });
  if (error) throw error;

  // Keep the auth metadata and any existing leaderboard rows in sync with the new name.
  await supabase.auth.updateUser({ data: { username: trimmed } });
  await supabase.from("scores").update({ name: trimmed }).eq("user_id", userId);
}

export type LeaderboardEntry = { userId: string; name: string; score: number };

export async function submitScore(languageId: string, score: number): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");
  const username = (user.user_metadata?.username as string | undefined)?.trim();
  const name = username || (user.email ?? "Anonymous").split("@")[0];

  // Only keep each player's personal best for this language.
  const { data: existing } = await supabase
    .from("scores")
    .select("score")
    .eq("language_id", languageId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing && existing.score >= score) return;

  const { error } = await supabase
    .from("scores")
    .upsert(
      { language_id: languageId, user_id: user.id, name, score, updated_at: new Date().toISOString() },
      { onConflict: "language_id,user_id" },
    );
  if (error) throw error;
}

export async function getLeaderboard(languageId: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("scores")
    .select("user_id, name, score")
    .eq("language_id", languageId)
    .order("score", { ascending: false })
    .order("updated_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({ userId: r.user_id as string, name: r.name as string, score: r.score as number }));
}

export async function updateHighScore(languageId: string, score: number, currentHigh: number): Promise<boolean> {
  if (score <= currentHigh) return false;
  const { error } = await supabase
    .from("languages")
    .update({ high_score: score })
    .eq("id", languageId);
  if (error) throw error;
  return true;
}
