export type Word = { id: string; target: string; english: string };
export type Language = { id: string; name: string; words: Word[]; highScore: number };

const KEY = "lang-flashcards-v1";

type Store = { languages: Language[] };

function read(): Store {
  if (typeof window === "undefined") return { languages: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { languages: [] };
    return JSON.parse(raw) as Store;
  } catch {
    return { languages: [] };
  }
}

function write(store: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("lang-store-update"));
}

export function getLanguages(): Language[] {
  return read().languages;
}

export function getLanguage(id: string): Language | undefined {
  return read().languages.find((l) => l.id === id);
}

export function addLanguage(name: string): Language {
  const store = read();
  const lang: Language = {
    id: crypto.randomUUID(),
    name: name.trim(),
    words: [],
    highScore: 0,
  };
  store.languages.push(lang);
  write(store);
  return lang;
}

export function deleteLanguage(id: string) {
  const store = read();
  store.languages = store.languages.filter((l) => l.id !== id);
  write(store);
}

export function addWord(languageId: string, target: string, english: string) {
  const store = read();
  const lang = store.languages.find((l) => l.id === languageId);
  if (!lang) return;
  lang.words.push({
    id: crypto.randomUUID(),
    target: target.trim(),
    english: english.trim(),
  });
  write(store);
}

export function deleteWord(languageId: string, wordId: string) {
  const store = read();
  const lang = store.languages.find((l) => l.id === languageId);
  if (!lang) return;
  lang.words = lang.words.filter((w) => w.id !== wordId);
  write(store);
}

export function updateHighScore(languageId: string, score: number): boolean {
  const store = read();
  const lang = store.languages.find((l) => l.id === languageId);
  if (!lang) return false;
  if (score > lang.highScore) {
    lang.highScore = score;
    write(store);
    return true;
  }
  return false;
}

import { useEffect, useState } from "react";

export function useStore<T>(selector: () => T): T {
  const [value, setValue] = useState<T>(() => selector());
  useEffect(() => {
    const update = () => setValue(selector());
    update();
    window.addEventListener("lang-store-update", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("lang-store-update", update);
      window.removeEventListener("storage", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}
