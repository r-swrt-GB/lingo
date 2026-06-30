import { useCallback, useEffect, useState } from "react";
import { synthesizeSpeech } from "./tts";

// Single source of truth for selectable languages. The same catalog powers the
// language picker when creating a language AND the voice lookup here, so a
// chosen language always resolves to a usable SpeechSynthesis locale. Languages
// are stored by their display `name`; we map back to the BCP-47 locale by name.
export type LanguageOption = { name: string; locale: string };

export const LANGUAGES: LanguageOption[] = [
  { name: "Afrikaans", locale: "af-ZA" },
  { name: "Arabic", locale: "ar-SA" },
  { name: "Cantonese", locale: "zh-HK" },
  { name: "Chinese (Mandarin)", locale: "zh-CN" },
  { name: "Czech", locale: "cs-CZ" },
  { name: "Danish", locale: "da-DK" },
  { name: "Dutch", locale: "nl-NL" },
  { name: "English", locale: "en-US" },
  { name: "Finnish", locale: "fi-FI" },
  { name: "French", locale: "fr-FR" },
  { name: "German", locale: "de-DE" },
  { name: "Greek", locale: "el-GR" },
  { name: "Hebrew", locale: "he-IL" },
  { name: "Hindi", locale: "hi-IN" },
  { name: "Hungarian", locale: "hu-HU" },
  { name: "Indonesian", locale: "id-ID" },
  { name: "Italian", locale: "it-IT" },
  { name: "Japanese", locale: "ja-JP" },
  { name: "Korean", locale: "ko-KR" },
  { name: "Norwegian", locale: "nb-NO" },
  { name: "Polish", locale: "pl-PL" },
  { name: "Portuguese", locale: "pt-PT" },
  { name: "Romanian", locale: "ro-RO" },
  { name: "Russian", locale: "ru-RU" },
  { name: "Setswana", locale: "tn-ZA" },
  { name: "Spanish", locale: "es-ES" },
  { name: "Swedish", locale: "sv-SE" },
  { name: "Thai", locale: "th-TH" },
  { name: "Turkish", locale: "tr-TR" },
  { name: "Ukrainian", locale: "uk-UA" },
  { name: "Vietnamese", locale: "vi-VN" },
];


export const speechSupported =
  typeof window !== "undefined" && "speechSynthesis" in window;

// Voices load asynchronously in most browsers, so we keep a live list.
function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!speechSupported) return;
    const update = () => setVoices(window.speechSynthesis.getVoices());
    update();
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);

  return voices;
}

function pickVoice(voices: SpeechSynthesisVoice[], locale: string | undefined) {
  if (!locale) return undefined;
  const lang = locale.toLowerCase();
  const base = lang.split("-")[0];
  return (
    voices.find((v) => v.lang.toLowerCase() === lang) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(base))
  );
}

// Cache synthesized audio per session (words repeat constantly), and remember
// locales Google can't handle so we skip straight to the browser voice for them.
const audioCache = new Map<string, string>();
const googleUnsupported = new Set<string>();
let currentAudio: HTMLAudioElement | null = null;

function speakWithWebSpeech(text: string, locale: string | undefined, voices: SpeechSynthesisVoice[]) {
  if (!speechSupported) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(voices, locale);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else if (locale) {
    utterance.lang = locale;
  }
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

function stopPlayback() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (speechSupported) window.speechSynthesis.cancel();
}

/**
 * Returns a `speak(text)` function that pronounces text with Google Cloud TTS
 * (via the server proxy), falling back to the browser's Web Speech voice when
 * Google is unavailable or doesn't support the locale.
 */
export function useSpeak(locale: string | undefined) {
  const voices = useVoices();

  return useCallback(
    async (text: string) => {
      const value = text.trim();
      if (!value) return;
      const lang = locale ?? "en-US";
      stopPlayback();

      // Locales Google has already rejected go straight to the browser voice.
      if (!googleUnsupported.has(lang)) {
        const key = `${lang}|${value}`;
        try {
          let audioContent = audioCache.get(key);
          if (!audioContent) {
            const result = await synthesizeSpeech({ data: { text: value, locale: lang } });
            audioContent = result.audioContent;
            audioCache.set(key, audioContent);
          }
          const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
          currentAudio = audio;
          await audio.play();
          return;
        } catch {
          // Treat any failure (unsupported locale, missing key, network) as a
          // signal to use the browser voice instead.
          googleUnsupported.add(lang);
        }
      }

      speakWithWebSpeech(value, locale, voices);
    },
    [voices, locale],
  );
}
