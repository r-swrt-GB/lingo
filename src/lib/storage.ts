import { supabase } from "./supabase";

export type Word = { id: string; target: string; english: string };
export type Role = "owner" | "editor" | "viewer";

export type Language = {
  id: string;
  name: string;
  isPublic: boolean;
  userId: string;
  createdBy: string;
  myRole: Role;
};

export type LanguageDetail = Language & { words: Word[] };

export type Deck = {
  id: string;
  languageId: string;
  name: string;
  wordCount: number;
  myHighScore: number;
};

type DbLanguage = {
  id: string;
  name: string;
  is_public: boolean;
  user_id: string;
};

type DbLanguageDetail = DbLanguage & {
  words: { id: string; target: string; english: string }[];
};

function mapLanguage(row: DbLanguage, createdBy: string, myRole: Role): Language {
  return {
    id: row.id,
    name: row.name,
    isPublic: row.is_public,
    userId: row.user_id,
    createdBy,
    myRole,
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
    .select("id, name, is_public, user_id")
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

export async function getLanguage(id: string): Promise<LanguageDetail | undefined> {
  const me = await getUserId();
  const { data, error } = await supabase
    .from("languages")
    .select("id, name, is_public, user_id, words(id, target, english)")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return undefined;
    throw error;
  }
  const row = data as DbLanguageDetail;
  const [profiles, roles] = await Promise.all([profilesByUserId([row.user_id]), myMemberRoles(me)]);
  return {
    ...mapLanguage(row, profiles.get(row.user_id)?.username ?? "Unknown", resolveRole(row.user_id, row.id, me, roles)),
    words: row.words ?? [],
  };
}

export async function addLanguage(name: string, isPublic: boolean): Promise<Language> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("languages")
    .insert({ name: name.trim(), user_id: userId, is_public: isPublic })
    .select("id, name, is_public, user_id")
    .single();
  if (error) throw error;
  const profiles = await profilesByUserId([userId]);
  return {
    id: data.id,
    name: data.name,
    isPublic: data.is_public,
    userId: data.user_id,
    createdBy: profiles.get(userId)?.username ?? "You",
    myRole: "owner",
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

export async function addWordInDeck(languageId: string, deckId: string, target: string, english: string): Promise<void> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("words")
    .insert({ language_id: languageId, user_id: userId, target: target.trim(), english: english.trim() })
    .select("id")
    .single();
  if (error) throw error;
  const { error: dwError } = await supabase
    .from("deck_words")
    .insert({ deck_id: deckId, word_id: data.id as string });
  if (dwError) throw dwError;
}

export async function addWordsInDeck(
  languageId: string,
  deckId: string,
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
  const { data, error } = await supabase.from("words").insert(rows).select("id");
  if (error) throw error;
  const dwRows = (data ?? []).map((r) => ({ deck_id: deckId, word_id: r.id as string }));
  if (dwRows.length > 0) {
    const { error: dwError } = await supabase.from("deck_words").insert(dwRows);
    if (dwError) throw dwError;
  }
}

// --- Decks ---

export async function getDecks(languageId: string): Promise<Deck[]> {
  const userId = await getUserId();
  const { data: deckRows, error } = await supabase
    .from("decks")
    .select("id, language_id, name, deck_words(word_id)")
    .eq("language_id", languageId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const deckIds = (deckRows ?? []).map((d) => d.id as string);
  const scoreMap = new Map<string, number>();
  if (deckIds.length > 0) {
    const { data: scores } = await supabase
      .from("scores")
      .select("deck_id, score")
      .in("deck_id", deckIds)
      .eq("user_id", userId);
    for (const s of scores ?? []) scoreMap.set(s.deck_id as string, s.score as number);
  }

  return (deckRows ?? []).map((d) => ({
    id: d.id as string,
    languageId: d.language_id as string,
    name: d.name as string,
    wordCount: Array.isArray(d.deck_words) ? (d.deck_words as unknown[]).length : 0,
    myHighScore: scoreMap.get(d.id as string) ?? 0,
  }));
}

export async function getDeck(deckId: string): Promise<{ id: string; languageId: string; name: string; myHighScore: number } | undefined> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("decks")
    .select("id, language_id, name")
    .eq("id", deckId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return undefined;
    throw error;
  }
  const { data: scoreData } = await supabase
    .from("scores")
    .select("score")
    .eq("deck_id", deckId)
    .eq("user_id", userId)
    .maybeSingle();
  return {
    id: data.id as string,
    languageId: data.language_id as string,
    name: data.name as string,
    myHighScore: (scoreData?.score as number) ?? 0,
  };
}

export async function addDeck(languageId: string, name: string): Promise<Deck> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("decks")
    .insert({ language_id: languageId, name: name.trim(), user_id: userId })
    .select("id, language_id, name")
    .single();
  if (error) throw error;
  return {
    id: data.id as string,
    languageId: data.language_id as string,
    name: data.name as string,
    wordCount: 0,
    myHighScore: 0,
  };
}

export async function deleteDeck(deckId: string): Promise<void> {
  const { error } = await supabase.from("decks").delete().eq("id", deckId);
  if (error) throw error;
}

export async function getDeckWords(deckId: string): Promise<Word[]> {
  const { data: dwData, error: dwError } = await supabase
    .from("deck_words")
    .select("word_id")
    .eq("deck_id", deckId);
  if (dwError) throw dwError;
  const wordIds = (dwData ?? []).map((r) => r.word_id as string);
  if (wordIds.length === 0) return [];
  const { data, error } = await supabase
    .from("words")
    .select("id, target, english")
    .in("id", wordIds);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    target: r.target as string,
    english: r.english as string,
  }));
}

export async function getDeckWordIds(deckId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("deck_words")
    .select("word_id")
    .eq("deck_id", deckId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.word_id as string));
}

export async function addWordToDeck(deckId: string, wordId: string): Promise<void> {
  const { error } = await supabase.from("deck_words").insert({ deck_id: deckId, word_id: wordId });
  if (error) throw error;
}

export async function removeWordFromDeck(deckId: string, wordId: string): Promise<void> {
  const { error } = await supabase
    .from("deck_words")
    .delete()
    .eq("deck_id", deckId)
    .eq("word_id", wordId);
  if (error) throw error;
}

// --- Users / Members ---

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

// --- Profile ---

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

  await supabase.auth.updateUser({ data: { username: trimmed } });
  await supabase.from("scores").update({ name: trimmed }).eq("user_id", userId);
}

// --- Scores / Leaderboard ---

export type LeaderboardEntry = { userId: string; name: string; score: number };

// Returns true if the submitted score is a new personal best.
export async function submitScore(deckId: string, score: number): Promise<boolean> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");
  const username = (user.user_metadata?.username as string | undefined)?.trim();
  const name = username || (user.email ?? "Anonymous").split("@")[0];

  const { data: existing } = await supabase
    .from("scores")
    .select("score")
    .eq("deck_id", deckId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing && existing.score >= score) return false;

  const { error } = await supabase
    .from("scores")
    .upsert(
      { deck_id: deckId, user_id: user.id, name, score, updated_at: new Date().toISOString() },
      { onConflict: "deck_id,user_id" },
    );
  if (error) throw error;
  return true;
}

export async function getLeaderboard(deckId: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("scores")
    .select("user_id, name, score")
    .eq("deck_id", deckId)
    .order("score", { ascending: false })
    .order("updated_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    userId: r.user_id as string,
    name: r.name as string,
    score: r.score as number,
  }));
}
