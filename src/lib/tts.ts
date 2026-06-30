import { createServerFn } from "@tanstack/react-start";

// Server-side proxy to Google Cloud Text-to-Speech. Runs only on the server, so
// the API key (GOOGLE_TTS_API_KEY) is never exposed to the browser. Returns the
// spoken audio as a base64-encoded MP3 string.
export const synthesizeSpeech = createServerFn({ method: "POST" })
  .inputValidator((data: { text: string; locale: string }) => {
    const text = (data?.text ?? "").trim();
    if (!text) throw new Error("text is required");
    return { text: text.slice(0, 200), locale: data.locale || "en-US" };
  })
  .handler(async ({ data }): Promise<{ audioContent: string }> => {
    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_TTS_API_KEY is not configured");

    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text: data.text },
          // Let Google pick a default voice for the language code.
          voice: { languageCode: data.locale },
          audioConfig: { audioEncoding: "MP3", speakingRate: 0.9 },
        }),
      },
    );

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Google TTS failed (${res.status}): ${detail}`);
    }

    const json = (await res.json()) as { audioContent?: string };
    if (!json.audioContent) throw new Error("Google TTS returned no audio");
    return { audioContent: json.audioContent };
  });
