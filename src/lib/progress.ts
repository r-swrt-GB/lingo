import type { Word } from "./storage";

export type Question = { word: Word; options: string[] };

export type SavedProgress = {
  questions: Question[];
  index: number;
  score: number;
};

const key = (languageId: string) => `wordy:progress:${languageId}`;

export function saveProgress(languageId: string, data: SavedProgress): void {
  try {
    localStorage.setItem(key(languageId), JSON.stringify(data));
  } catch {
    // storage may be unavailable (private mode, quota) — fail silently
  }
}

export function clearProgress(languageId: string): void {
  try {
    localStorage.removeItem(key(languageId));
  } catch {
    // ignore
  }
}

// Returns saved progress only if it's still a coherent, in-progress session
// for the current set of words. Any mismatch (words added/removed, finished,
// not started) is treated as no progress.
export function loadProgress(languageId: string, words: Word[]): SavedProgress | null {
  try {
    const raw = localStorage.getItem(key(languageId));
    if (!raw) return null;
    const data = JSON.parse(raw) as SavedProgress;
    if (
      !data ||
      !Array.isArray(data.questions) ||
      data.questions.length !== words.length ||
      typeof data.index !== "number" ||
      typeof data.score !== "number" ||
      data.index <= 0 ||
      data.index >= data.questions.length
    ) {
      return null;
    }
    const ids = new Set(words.map((w) => w.id));
    if (!data.questions.every((q) => q.word && ids.has(q.word.id))) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasProgress(languageId: string, words: Word[]): boolean {
  return loadProgress(languageId, words) !== null;
}
