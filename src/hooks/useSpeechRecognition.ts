import { useState, useEffect, useRef, useCallback } from "react";
import { LanguageCode, SubtitleItem } from "../types";
import { requestTranslation, speakTranslation } from "../utils/translator";

interface UseSpeechRecognitionOptions {
  currentLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  speakerId: string;
  speakerName: string;
  speakerLocation: string;
  autoSpeakTranslation?: boolean;
  onNewSubtitle?: (item: SubtitleItem) => void;
}

export function useSpeechRecognition({
  currentLanguage,
  targetLanguage,
  speakerId,
  speakerName,
  speakerLocation,
  autoSpeakTranslation = false,
  onNewSubtitle,
}: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimText, setInterimText] = useState("");
  const [activeSubtitle, setActiveSubtitle] = useState<SubtitleItem | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const recognitionRef = useRef<any>(null);
  const onNewSubtitleRef = useRef(onNewSubtitle);
  onNewSubtitleRef.current = onNewSubtitle;

  const currentLangRef = useRef(currentLanguage);
  currentLangRef.current = currentLanguage;

  const targetLangRef = useRef(targetLanguage);
  targetLangRef.current = targetLanguage;

  const autoSpeakRef = useRef(autoSpeakTranslation);
  autoSpeakRef.current = autoSpeakTranslation;

  // Process text through translation
  const processAndEmitSubtitle = useCallback(
    async (text: string, isFinal: boolean) => {
      if (!text.trim()) return;

      setIsTranslating(true);
      const res = await requestTranslation(text, currentLangRef.current, targetLangRef.current);
      setIsTranslating(false);

      const item: SubtitleItem = {
        id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        speakerId,
        speakerName,
        speakerLocation,
        originalText: text,
        sourceLang: currentLangRef.current,
        translatedText: res.translatedText,
        targetLang: targetLangRef.current,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        isFinal,
      };

      setActiveSubtitle(item);
      if (isFinal) {
        onNewSubtitleRef.current?.(item);
        if (autoSpeakRef.current) {
          speakTranslation(res.translatedText, targetLangRef.current);
        }
      }
    },
    [speakerId, speakerName, speakerLocation]
  );

  // Initialize browser speech recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = currentLanguage === "es" ? "es-CO" : "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (interim) {
          setInterimText(interim);
        }

        if (final) {
          setInterimText("");
          processAndEmitSubtitle(final, true);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn("Error initializing speech recognition:", err);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, [currentLanguage, processAndEmitSubtitle]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = currentLanguage === "es" ? "es-CO" : "en-US";
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Recognition start failed or already active:", err);
      }
    }
  }, [currentLanguage]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (err) {
        console.warn("Recognition stop failed:", err);
      }
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Allows triggering a sentence manually (e.g., from quick phrases or test buttons)
  const injectUtterance = useCallback(
    async (text: string) => {
      setInterimText(text);
      await processAndEmitSubtitle(text, true);
      setInterimText("");
    },
    [processAndEmitSubtitle]
  );

  return {
    isListening,
    isSupported,
    interimText,
    activeSubtitle,
    isTranslating,
    startListening,
    stopListening,
    toggleListening,
    injectUtterance,
    setActiveSubtitle,
  };
}
