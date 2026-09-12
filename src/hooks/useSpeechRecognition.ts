import { useState, useEffect, useRef, useCallback } from "react";
import { LanguageCode, SubtitleItem } from "../types";
import {
  requestTranslation,
  speakTranslation,
  requestAiAudioTranscriptionAndTranslation,
} from "../utils/translator";

interface UseSpeechRecognitionOptions {
  currentLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  speakerId: string;
  speakerName: string;
  speakerLocation: string;
  mediaStream?: MediaStream | null;
  autoSpeakTranslation?: boolean;
  onNewSubtitle?: (item: SubtitleItem) => void;
}

export function useSpeechRecognition({
  currentLanguage,
  targetLanguage,
  speakerId,
  speakerName,
  speakerLocation,
  mediaStream,
  autoSpeakTranslation = true,
  onNewSubtitle,
}: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimText, setInterimText] = useState("");
  const [activeSubtitle, setActiveSubtitle] = useState<SubtitleItem | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [aiStatus, setAiStatus] = useState<"idle" | "listening" | "analyzing" | "translated">("idle");
  const [aiStatusMessage, setAiStatusMessage] = useState("IA lista para escuchar");
  const [audioInputLevel, setAudioInputLevel] = useState(0);

  const recognitionRef = useRef<any>(null);
  const onNewSubtitleRef = useRef(onNewSubtitle);
  onNewSubtitleRef.current = onNewSubtitle;

  const currentLangRef = useRef(currentLanguage);
  currentLangRef.current = currentLanguage;

  const targetLangRef = useRef(targetLanguage);
  targetLangRef.current = targetLanguage;

  const autoSpeakRef = useRef(autoSpeakTranslation);
  autoSpeakRef.current = autoSpeakTranslation;

  // MediaRecorder & VAD refs for direct Gemini AI audio stream listening
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const isSpeakingRef = useRef(false);
  const silenceTimerRef = useRef<any>(null);
  const maxSpeechTimerRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastProcessedTextRef = useRef<string>("");
  const lastProcessedTimeRef = useRef<number>(0);

  // Process and emit a subtitle item (from speech or translation)
  const emitSubtitle = useCallback(
    (originalText: string, translatedText: string, detectedLang: LanguageCode, targetLang: LanguageCode) => {
      const cleanOriginal = originalText.trim();
      const cleanTranslated = translatedText.trim();
      if (!cleanOriginal) return;

      // Deduplicate rapid identical phrases within 3 seconds
      const now = Date.now();
      if (
        lastProcessedTextRef.current.toLowerCase() === cleanOriginal.toLowerCase() &&
        now - lastProcessedTimeRef.current < 3000
      ) {
        return;
      }
      lastProcessedTextRef.current = cleanOriginal;
      lastProcessedTimeRef.current = now;

      const item: SubtitleItem = {
        id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        speakerId,
        speakerName,
        speakerLocation,
        originalText: cleanOriginal,
        sourceLang: detectedLang,
        translatedText: cleanTranslated,
        targetLang,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        isFinal: true,
      };

      setActiveSubtitle(item);
      setAiStatus("translated");
      setAiStatusMessage("¡Traducido instantáneamente!");
      onNewSubtitleRef.current?.(item);

      if (autoSpeakRef.current) {
        speakTranslation(cleanTranslated, targetLang);
      }

      setTimeout(() => {
        setAiStatus("listening");
        setAiStatusMessage("IA Escuchando en vivo...");
      }, 3500);
    },
    [speakerId, speakerName, speakerLocation]
  );

  // Fallback text translator if recognition emitted text without audio payload
  const processAndEmitFromText = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      setIsTranslating(true);
      setAiStatus("analyzing");
      setAiStatusMessage("Gemini traduciendo...");

      try {
        const res = await requestTranslation(text, currentLangRef.current, targetLangRef.current);
        emitSubtitle(text, res.translatedText, res.detectedLanguage || currentLangRef.current, res.targetLanguage || targetLangRef.current);
      } catch (err) {
        console.warn("Translation failed:", err);
      } finally {
        setIsTranslating(false);
      }
    },
    [emitSubtitle]
  );

  // Send captured audio blob to server-side Gemini AI for direct listening & translation
  const processAudioBlob = useCallback(
    async (blob: Blob) => {
      if (blob.size < 1000) return; // ignore tiny audio clicks
      setIsTranslating(true);
      setAiStatus("analyzing");
      setAiStatusMessage("IA escuchando audio y traduciendo con Gemini...");

      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const res = reader.result as string;
            resolve(res);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(blob);

        const base64Data = await base64Promise;
        const res = await requestAiAudioTranscriptionAndTranslation(
          base64Data,
          blob.type || "audio/webm",
          currentLangRef.current
        );

        if (res.hasSpeech && res.originalText?.trim()) {
          emitSubtitle(
            res.originalText,
            res.translatedText,
            res.detectedLanguage || currentLangRef.current,
            res.targetLanguage || targetLangRef.current
          );
        } else {
          setAiStatus("listening");
          setAiStatusMessage("IA Escuchando en vivo...");
        }
      } catch (err) {
        console.warn("Error processing audio with Gemini:", err);
        setAiStatus("listening");
        setAiStatusMessage("IA Escuchando en vivo...");
      } finally {
        setIsTranslating(false);
        setInterimText("");
      }
    },
    [emitSubtitle]
  );

  // 1. Direct AI Audio VAD & MediaRecorder integration from microphone stream
  useEffect(() => {
    if (!isListening || !mediaStream) {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        try {
          audioContextRef.current.close();
        } catch (_) {}
      }
      audioContextRef.current = null;
      analyserRef.current = null;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      return;
    }

    const audioTracks = mediaStream.getAudioTracks();
    if (audioTracks.length === 0 || !audioTracks[0].enabled) {
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(mediaStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Prepare MediaRecorder
      let mimeType = "audio/webm";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
          mimeType = "audio/ogg";
        }
      }

      let recorder: MediaRecorder | null = null;
      try {
        recorder = new MediaRecorder(mediaStream, { mimeType });
      } catch {
        try {
          recorder = new MediaRecorder(mediaStream);
        } catch (e) {
          console.warn("MediaRecorder creation error:", e);
        }
      }

      if (recorder) {
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          if (recordedChunksRef.current.length > 0) {
            const completeBlob = new Blob(recordedChunksRef.current, { type: recorder?.mimeType || "audio/webm" });
            recordedChunksRef.current = [];
            processAudioBlob(completeBlob);
          }
        };
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkAudioLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setAudioInputLevel(normalized);

        const SPEECH_THRESHOLD = 14;

        if (normalized > SPEECH_THRESHOLD) {
          // Person is talking
          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            setAiStatus("listening");
            setAiStatusMessage("Detectando voz en vivo...");
            recordedChunksRef.current = [];

            if (recorder && recorder.state === "inactive") {
              try {
                recorder.start();
              } catch (_) {}
            }

            // Cap max recording to 6 seconds to avoid huge delays
            clearTimeout(maxSpeechTimerRef.current);
            maxSpeechTimerRef.current = setTimeout(() => {
              if (recorder && recorder.state === "recording") {
                try {
                  recorder.stop();
                } catch (_) {}
              }
              isSpeakingRef.current = false;
            }, 6000);
          }

          // Reset silence timer
          clearTimeout(silenceTimerRef.current);
        } else if (isSpeakingRef.current) {
          // Person was talking, now quiet
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              isSpeakingRef.current = false;
              clearTimeout(maxSpeechTimerRef.current);
              silenceTimerRef.current = null;

              if (recorder && recorder.state === "recording") {
                try {
                  recorder.stop();
                } catch (_) {}
              }
            }, 900); // 900ms pause indicates end of conversational sentence
          }
        }

        animFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };

      animFrameRef.current = requestAnimationFrame(checkAudioLevel);
    } catch (err) {
      console.warn("Could not set up direct audio listener:", err);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      clearTimeout(silenceTimerRef.current);
      clearTimeout(maxSpeechTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        try {
          mediaRecorderRef.current.stop();
        } catch (_) {}
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        try {
          audioContextRef.current.close();
        } catch (_) {}
      }
    };
  }, [isListening, mediaStream, processAudioBlob]);

  // 2. Tandem Browser SpeechRecognition for instant word-by-word visual feedback
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
        setAiStatus("listening");
        setAiStatusMessage("IA Escuchando en vivo...");
      };

      recognition.onend = () => {
        // If still expected to listen, auto-restart to maintain persistent listening
        if (isListening) {
          try {
            recognition.start();
          } catch (_) {}
        }
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
          setAiStatus("listening");
          setAiStatusMessage("Escuchando: \"" + interim + "\"");
        }

        if (final) {
          setInterimText("");
          // Fallback or immediate translation via Gemini
          processAndEmitFromText(final);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          console.warn("Speech recognition access not permitted:", event.error);
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
  }, [currentLanguage, processAndEmitFromText, isListening]);

  // Public control methods
  const startListening = useCallback(() => {
    setIsListening(true);
    setAiStatus("listening");
    setAiStatusMessage("IA Escuchando en vivo...");

    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = currentLanguage === "es" ? "es-CO" : "en-US";
        recognitionRef.current.start();
      } catch (_) {}
    }
  }, [currentLanguage]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    setAiStatus("idle");
    setAiStatusMessage("Escucha en pausa");
    setInterimText("");

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Inject a manual spoken utterance (useful for test buttons and quick phrases)
  const injectUtterance = useCallback(
    async (text: string) => {
      setInterimText(text);
      await processAndEmitFromText(text);
      setInterimText("");
    },
    [processAndEmitFromText]
  );

  return {
    isListening,
    isSupported,
    interimText,
    activeSubtitle,
    isTranslating,
    aiStatus,
    aiStatusMessage,
    audioInputLevel,
    startListening,
    stopListening,
    toggleListening,
    injectUtterance,
    setActiveSubtitle,
  };
}
