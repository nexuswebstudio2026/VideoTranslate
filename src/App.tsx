import React, { useState, useEffect, useCallback, useRef } from "react";
import { Navbar } from "./components/Navbar";
import { VideoFeed } from "./components/VideoFeed";
import { CallControls } from "./components/CallControls";
import { QuickPhraseBar } from "./components/QuickPhraseBar";
import { TranscriptDrawer } from "./components/TranscriptDrawer";
import { SettingsModal } from "./components/SettingsModal";
import { CaptionBanner } from "./components/CaptionBanner";
import { useWebRTC } from "./hooks/useWebRTC";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import {
  Participant,
  SubtitleItem,
  AppTheme,
  ViewLayout,
} from "./types";
import { requestTranslation, speakTranslation } from "./utils/translator";
import {
  Sparkles,
  Wifi,
  PhoneCall,
  Info,
  ShieldCheck,
  Languages,
  CheckCircle2,
} from "lucide-react";

export default function App() {
  // Theme state: dark / light
  const [theme, setTheme] = useState<AppTheme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme_preference");
      if (saved === "light" || saved === "dark") return saved;
    }
    return "dark";
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("theme_preference", next);
      return next;
    });
  };

  // Subtitles and conversation history
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<SubtitleItem | null>(null);

  // Layout & Perspective
  const [viewLayout, setViewLayout] = useState<ViewLayout>("split");
  const [currentPerspective, setCurrentPerspective] = useState<"colombia" | "boston">("colombia");

  // Call duration timer
  const [callSeconds, setCallSeconds] = useState(0);
  const [isCallActive, setIsCallActive] = useState(true);

  // Settings states
  const [captionFontSize, setCaptionFontSize] = useState<"sm" | "base" | "lg" | "xl">("base");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [translationTone, setTranslationTone] = useState<"friendly" | "neutral" | "exact">("friendly");
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Remote simulation speech state
  const [remoteSpeaking, setRemoteSpeaking] = useState(false);
  const [remoteAudioLvl, setRemoteAudioLvl] = useState(0);
  const remoteAnimTimer = useRef<any>(null);

  // Participants
  const localParticipant: Participant = {
    id: "local-colombia",
    name: "Tú",
    location: "Colombia",
    countryCode: "CO",
    city: "Bogotá",
    nativeLanguage: "es",
    targetLanguage: "en",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
    isMuted: false,
    isVideoOff: false,
    isSpeaking: false,
    audioLevel: 0,
  };

  const remoteParticipant: Participant = {
    id: "remote-boston",
    name: "Sarah Miller",
    location: "Estados Unidos",
    countryCode: "US",
    city: "Boston, MA",
    nativeLanguage: "en",
    targetLanguage: "es",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80",
    isMuted: false,
    isVideoOff: false,
    isSpeaking: remoteSpeaking,
    audioLevel: remoteAudioLvl,
  };

  // WebRTC Hook for Camera and WebSocket room signaling
  const {
    localStream,
    isCameraActive,
    isMicMuted,
    isScreenSharing,
    localAudioLevel,
    cameraError,
    connectionState,
    toggleCamera,
    toggleMic,
    toggleScreenShare,
    broadcastSubtitle,
    reconnectCamera,
  } = useWebRTC({
    roomId: "boston-colombia",
    userId: "colombia-user",
    userName: "Tú (Colombia)",
    location: "Colombia",
    language: "es",
    onRemoteSubtitleReceived: (item) => {
      setActiveSubtitle(item);
      setSubtitles((prev) => [item, ...prev]);
      if (autoSpeak) {
        speakTranslation(item.translatedText, item.targetLang);
      }
    },
  });

  // Local participant enriched with dynamic stream state
  localParticipant.isMuted = isMicMuted;
  localParticipant.isVideoOff = !isCameraActive;
  localParticipant.audioLevel = localAudioLevel;
  localParticipant.isSpeaking = localAudioLevel > 15;

  // Speech Recognition Hook for live mic capture & instant translation
  const {
    isListening,
    interimText,
    isTranslating,
    startListening,
    stopListening,
    toggleListening,
    injectUtterance,
  } = useSpeechRecognition({
    currentLanguage: "es",
    targetLanguage: "en",
    speakerId: "local-colombia",
    speakerName: "Tú (Colombia)",
    speakerLocation: "Bogotá, Colombia",
    autoSpeakTranslation: autoSpeak,
    onNewSubtitle: (item) => {
      setActiveSubtitle(item);
      setSubtitles((prev) => [item, ...prev]);
      broadcastSubtitle(item);
    },
  });

  // Call timer effect
  useEffect(() => {
    if (!isCallActive) return;
    const interval = setInterval(() => {
      setCallSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isCallActive]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle simulated Boston partner speaking
  const triggerBostonSpeech = useCallback(
    async (englishText: string) => {
      if (!englishText.trim()) return;

      // Animate speaking audio levels
      setRemoteSpeaking(true);
      let step = 0;
      clearInterval(remoteAnimTimer.current);
      remoteAnimTimer.current = setInterval(() => {
        step++;
        setRemoteAudioLvl(Math.floor(40 + Math.random() * 50));
        if (step > 25) {
          clearInterval(remoteAnimTimer.current);
          setRemoteSpeaking(false);
          setRemoteAudioLvl(0);
        }
      }, 120);

      // Translate from English (Boston) to Spanish (Colombia)
      const res = await requestTranslation(englishText, "en", "es");

      const item: SubtitleItem = {
        id: `boston-${Date.now()}`,
        speakerId: "remote-boston",
        speakerName: "Sarah (Boston)",
        speakerLocation: "Boston, EE. UU.",
        originalText: englishText,
        sourceLang: "en",
        translatedText: res.translatedText,
        targetLang: "es",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        isFinal: true,
      };

      setActiveSubtitle(item);
      setSubtitles((prev) => [item, ...prev]);
      broadcastSubtitle(item);

      if (autoSpeak) {
        // Read out Spanish translation to Colombian user
        speakTranslation(res.translatedText, "es");
      }
    },
    [autoSpeak, broadcastSubtitle]
  );

  // Handle user speaking in Spanish (via quick phrase or simulated trigger)
  const triggerColombiaSpeech = useCallback(
    async (spanishText: string) => {
      await injectUtterance(spanishText);
    },
    [injectUtterance]
  );

  // Layout toggle handler
  const handleToggleLayout = () => {
    setViewLayout((prev) => (prev === "split" ? "remote-focus" : "split"));
  };

  // Perspective toggle handler
  const handleTogglePerspective = () => {
    setCurrentPerspective((prev) => (prev === "colombia" ? "boston" : "colombia"));
  };

  const isDark = theme === "dark";

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Top Navbar */}
      <Navbar
        theme={theme}
        onToggleTheme={toggleTheme}
        roomId="boston-colombia"
        onOpenTranscript={() => setIsTranscriptOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        transcriptCount={subtitles.length}
        autoSpeak={autoSpeak}
        onToggleAutoSpeak={() => setAutoSpeak((v) => !v)}
      />

      {/* Main Video Call Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 flex flex-col justify-between gap-4">
        {/* Call Info & Perspective Alert Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-2xl border text-xs backdrop-blur-md transition-all ${
          isDark
            ? 'bg-slate-900/60 border-slate-800 text-slate-300'
            : 'bg-white/80 border-slate-200 text-slate-700 shadow-2xs'
        }">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">Llamada en curso: {formatTimer(callSeconds)}</span>
            <span className="opacity-40">•</span>
            <span className="text-slate-400">Canal Seguro P2P / WebRTC HD</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                currentPerspective === "colombia"
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  : "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
              }`}
            >
              <Languages className="w-3.5 h-3.5" />
              <span>
                {currentPerspective === "colombia"
                  ? "Viendo desde Colombia 🇨🇴 (Sarah habla en inglés y tú lees en español)"
                  : "Viendo desde Boston 🇺🇸 (Tú hablas en español y Sarah lee en inglés)"}
              </span>
            </span>
          </div>
        </div>

        {/* Camera error message alert if permission denied */}
        {cameraError && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>
                Acceso a cámara local: {cameraError}. ¡Puedes usar las frases de prueba abajo para experimentar la traducción instantánea en tiempo real!
              </span>
            </div>
            <button
              onClick={reconnectCamera}
              className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shrink-0 hover:bg-amber-400 transition-all"
            >
              Reintentar Cámara
            </button>
          </div>
        )}

        {/* Dual Video Grid Layout */}
        <div
          id="video-stage-container"
          className={`w-full flex-1 grid gap-4 transition-all duration-300 ${
            viewLayout === "split"
              ? "grid-cols-1 md:grid-cols-2"
              : "grid-cols-1"
          }`}
        >
          {/* Colombian User Video Feed (Local or Perspective target) */}
          <div
            className={`w-full h-full ${
              viewLayout === "remote-focus" ? "hidden" : "block"
            }`}
          >
            <VideoFeed
              participant={localParticipant}
              stream={localStream}
              isLocal={true}
              activeSubtitle={activeSubtitle}
              interimText={interimText}
              theme={theme}
              captionFontSize={captionFontSize}
            />
          </div>

          {/* Boston Friend Video Feed (Remote) */}
          <div className="w-full h-full">
            <VideoFeed
              participant={remoteParticipant}
              stream={null} // Simulated remote or WebRTC peer stream
              isLocal={false}
              activeSubtitle={activeSubtitle}
              theme={theme}
              isSimulated={true}
              onSimulatedSpeak={() =>
                triggerBostonSpeech("Hey! It's so wonderful to talk to you today!")
              }
              captionFontSize={captionFontSize}
            />
          </div>
        </div>

        {/* Interactive Quick Phrase & Speech Simulator Bar */}
        <QuickPhraseBar
          theme={theme}
          onSendLocalPhrase={triggerColombiaSpeech}
          onSendRemotePhrase={triggerBostonSpeech}
          isTranslating={isTranslating}
        />

        {/* Sticky Lower Call Controls Bar */}
        <CallControls
          theme={theme}
          isMicMuted={isMicMuted}
          isVideoOff={!isCameraActive}
          isListening={isListening}
          isScreenSharing={isScreenSharing}
          autoSpeak={autoSpeak}
          viewLayout={viewLayout}
          currentPerspective={currentPerspective}
          onToggleMic={toggleMic}
          onToggleVideo={toggleCamera}
          onToggleListening={toggleListening}
          onToggleScreenShare={toggleScreenShare}
          onToggleAutoSpeak={() => setAutoSpeak((v) => !v)}
          onToggleLayout={handleToggleLayout}
          onTogglePerspective={handleTogglePerspective}
          onEndCall={() => {
            setIsCallActive((v) => !v);
          }}
          onRestartDevices={reconnectCamera}
        />
      </main>

      {/* Transcript History Drawer */}
      <TranscriptDrawer
        isOpen={isTranscriptOpen}
        onClose={() => setIsTranscriptOpen(false)}
        subtitles={subtitles}
        theme={theme}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        captionFontSize={captionFontSize}
        onChangeFontSize={setCaptionFontSize}
        autoSpeak={autoSpeak}
        onToggleAutoSpeak={() => setAutoSpeak((v) => !v)}
        translationTone={translationTone}
        onChangeTone={setTranslationTone}
      />
    </div>
  );
}
