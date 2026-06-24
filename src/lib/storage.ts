import { supabase } from "./supabase";

export type Word = { id: string; target: string; english: string };
export type Language = { id: string; name: string; words: Word[]; highScore: number };

type DbLanguage = { id: string; name: string; high_score: number; words: { id: string; target: string; english: string }[] };

function mapLanguage(row: DbLanguage): Language {
  return {
    id: row.id,
    name: row.name,
    highScore: row.high_score,
    words: row.words ?? [],
  };
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
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("languages")
    .select("id, name, high_score, words(id, target, english)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as DbLanguage[]).map(mapLanguage);
}

export async function getLanguage(id: string): Promise<Language | undefined> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("languages")
    .select("id, name, high_score, words(id, target, english)")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return undefined;
    throw error;
  }
  return mapLanguage(data as DbLanguage);
}

export async function addLanguage(name: string): Promise<Language> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("languages")
    .insert({ name: name.trim(), user_id: userId })
    .select("id, name, high_score")
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, highScore: data.high_score, words: [] };
}

export async function deleteLanguage(id: string): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase.from("languages").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function addWord(languageId: string, target: string, english: string): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from("words")
    .insert({ language_id: languageId, user_id: userId, target: target.trim(), english: english.trim() });
  if (error) throw error;
}

export async function deleteWord(wordId: string): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase.from("words").delete().eq("id", wordId).eq("user_id", userId);
  if (error) throw error;
}

export async function updateHighScore(languageId: string, score: number, currentHigh: number): Promise<boolean> {
  if (score <= currentHigh) return false;
  const userId = await getUserId();
  const { error } = await supabase
    .from("languages")
    .update({ high_score: score })
    .eq("id", languageId)
    .eq("user_id", userId);
  if (error) throw error;
  return true;
}
