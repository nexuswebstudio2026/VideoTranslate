import { LanguageCode } from "../types";

export interface TranslationResponse {
  translatedText: string;
  originalText: string;
  detectedLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  provider: "gemini" | "local-rule";
}

export async function requestTranslation(
  text: string,
  sourceLang: LanguageCode | "auto",
  targetLang: LanguageCode
): Promise<TranslationResponse> {
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        sourceLang,
        targetLang,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    const data = await res.json();
    return {
      translatedText: data.translatedText || text,
      originalText: text,
      detectedLanguage: data.detectedLanguage || (sourceLang === "auto" ? (targetLang === "es" ? "en" : "es") : sourceLang),
      targetLanguage: data.targetLanguage || targetLang,
      provider: data.provider || "gemini",
    };
  } catch (err) {
    console.warn("Translation API request failed, using quick fallback:", err);
    // Instant heuristic fallback
    return {
      translatedText: fallbackLocal(text, targetLang),
      originalText: text,
      detectedLanguage: targetLang === "es" ? "en" : "es",
      targetLanguage: targetLang,
      provider: "local-rule",
    };
  }
}

function fallbackLocal(text: string, targetLang: LanguageCode): string {
  const lower = text.trim().toLowerCase();
  const dictEs: Record<string, string> = {
    "hello": "¡Hola!",
    "hey": "¡Hola!",
    "how are you": "¿Cómo estás?",
    "how is boston": "¿Cómo está Boston?",
    "can you hear me": "¿Me escuchas bien?",
    "it is cold here": "Hace frío por acá",
    "good to see you": "¡Qué bueno verte!",
    "i miss you": "Te extraño",
    "bye": "¡Chao!",
  };

  const dictEn: Record<string, string> = {
    "hola": "Hello!",
    "cómo estás": "How are you?",
    "como estas": "How are you?",
    "todo bien": "Everything is good",
    "te escucho bien": "I hear you well",
    "acá en colombia hace sol": "Here in Colombia it is sunny",
    "qué gusto verte": "So good to see you!",
    "chao": "Bye bye!",
  };

  if (targetLang === "es") {
    for (const [key, val] of Object.entries(dictEs)) {
      if (lower.includes(key)) return val;
    }
    return `[Traducción ES] ${text}`;
  } else {
    for (const [key, val] of Object.entries(dictEn)) {
      if (lower.includes(key)) return val;
    }
    return `[Translation EN] ${text}`;
  }
}

export function speakTranslation(text: string, lang: LanguageCode) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Stop any pending utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "es" ? "es-CO" : "en-US";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick a natural sounding voice if available
    const voices = window.speechSynthesis.getVoices();
    const targetPrefix = lang === "es" ? "es" : "en";
    const foundVoice = voices.find((v) => v.lang.toLowerCase().startsWith(targetPrefix));
    if (foundVoice) {
      utterance.voice = foundVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Speech synthesis error:", err);
  }
}
