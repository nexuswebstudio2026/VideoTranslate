import React, { useState, useEffect, useCallback, useRef } from "react";
import { Navbar } from "./components/Navbar";
import { VideoFeed } from "./components/VideoFeed";
import { CallControls } from "./components/CallControls";
import { QuickPhraseBar } from "./components/QuickPhraseBar";
import { TranscriptDrawer } from "./components/TranscriptDrawer";
import { SettingsModal } from "./components/SettingsModal";
import { LoginModal } from "./components/LoginModal";
import { PermissionRequestModal } from "./components/PermissionRequestModal";
import { useWebRTC } from "./hooks/useWebRTC";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import {
  Participant,
  SubtitleItem,
  AppTheme,
  ViewLayout,
  UserAccount,
  PermissionsState,
} from "./types";
import { requestTranslation, speakTranslation } from "./utils/translator";
import {
  Sparkles,
  Wifi,
  Languages,
  CheckCircle2,
  MapPin,
  Camera,
  Mic,
  ArrowLeftRight,
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

  // User session state (Username and password authentication)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("voz_current_user");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return null;
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(!currentUser);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);

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

  // Active user data defaults
  const userRole = currentUser?.role || "colombia";
  const isUserBoston = userRole === "boston";

  // WebRTC Hook for Camera, Mic, Geolocation, and WebSocket room signaling
  const {
    localStream,
    remoteStream,
    isCameraActive,
    isMicMuted,
    isScreenSharing,
    localAudioLevel,
    cameraError,
    permissions,
    remotePeerInfo,
    connectionState,
    toggleCamera,
    toggleMic,
    toggleScreenShare,
    broadcastSubtitle,
    requestMediaAndPermissions,
    reconnectCamera,
  } = useWebRTC({
    roomId: "boston-colombia",
    userId: currentUser?.username || "colombia",
    userName: currentUser?.displayName || "Tú (Colombia)",
    location: currentUser?.locationName || (isUserBoston ? "Boston, EE. UU." : "Bogotá, Colombia"),
    language: currentUser?.nativeLanguage || (isUserBoston ? "en" : "es"),
    onRemoteSubtitleReceived: (item) => {
      setActiveSubtitle(item);
      setSubtitles((prev) => [item, ...prev]);
      if (autoSpeak) {
        speakTranslation(item.translatedText, item.targetLang);
      }
    },
  });

  // Handle successful login
  const handleLoginSuccess = async (user: UserAccount) => {
    setCurrentUser(user);
    localStorage.setItem("voz_current_user", JSON.stringify(user));
    setIsLoginModalOpen(false);
    setCurrentPerspective(user.role === "boston" ? "boston" : "colombia");

    // Automatically prompt for Camera, Mic, and Location upon connecting
    setIsPermissionModalOpen(true);
    await requestMediaAndPermissions();
  };

  // Request permissions button callback
  const handleGrantPermissions = async () => {
    await requestMediaAndPermissions();
    setIsPermissionModalOpen(false);
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("voz_current_user");
    setCurrentUser(null);
    setIsLoginModalOpen(true);
  };

  // Switch account easily
  const handleSwitchAccount = () => {
    setIsLoginModalOpen(true);
  };

  // Setup participants dynamically based on current user account
  const localParticipant: Participant = {
    id: currentUser ? `user-${currentUser.username}` : "local-user",
    name: currentUser?.displayName || "Tú",
    location: currentUser?.locationName || (isUserBoston ? "Boston, EE. UU." : "Colombia"),
    countryCode: currentUser?.countryCode || (isUserBoston ? "US" : "CO"),
    city: currentUser?.city || (isUserBoston ? "Boston, MA" : "Bogotá"),
    nativeLanguage: currentUser?.nativeLanguage || (isUserBoston ? "en" : "es"),
    targetLanguage: currentUser?.targetLanguage || (isUserBoston ? "es" : "en"),
    avatarUrl:
      currentUser?.avatarUrl ||
      (isUserBoston
        ? "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80"
        : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"),
    isMuted: isMicMuted,
    isVideoOff: !isCameraActive,
    isSpeaking: localAudioLevel > 15,
    audioLevel: localAudioLevel,
  };

  const remoteParticipant: Participant = {
    id: remotePeerInfo?.userId || (isUserBoston ? "user-colombia" : "user-boston"),
    name: remotePeerInfo?.userName || (isUserBoston ? "Compañero (Colombia)" : "Sarah Miller"),
    location: remotePeerInfo?.location || (isUserBoston ? "Bogotá, Colombia" : "Estados Unidos"),
    countryCode: isUserBoston ? "CO" : "US",
    city: isUserBoston ? "Bogotá" : "Boston, MA",
    nativeLanguage: (remotePeerInfo?.language as any) || (isUserBoston ? "es" : "en"),
    targetLanguage: isUserBoston ? "en" : "es",
    avatarUrl: isUserBoston
      ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"
      : "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80",
    isMuted: false,
    isVideoOff: false,
    isSpeaking: remoteSpeaking,
    audioLevel: remoteAudioLvl,
  };

  // Speech Recognition Hook for live mic capture & instant translation with Gemini AI
  const currentLang = localParticipant.nativeLanguage;
  const targetLang = localParticipant.targetLanguage;

  const {
    isListening,
    interimText,
    isTranslating,
    aiStatus,
    aiStatusMessage,
    audioInputLevel,
    startListening,
    stopListening,
    toggleListening,
    injectUtterance,
  } = useSpeechRecognition({
    currentLanguage: currentLang,
    targetLanguage: targetLang,
    speakerId: localParticipant.id,
    speakerName: localParticipant.name,
    speakerLocation: localParticipant.location,
    mediaStream: localStream,
    autoSpeakTranslation: autoSpeak,
    onNewSubtitle: (item) => {
      setActiveSubtitle(item);
      setSubtitles((prev) => [item, ...prev]);
      broadcastSubtitle(item);
    },
  });

  // Automatically start listening when media permissions are granted
  useEffect(() => {
    if (localStream && !isMicMuted && !isListening && currentUser) {
      startListening();
    }
  }, [localStream, isMicMuted, isListening, startListening, currentUser]);

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

  // Handle remote partner speaking (simulated or remote trigger)
  const triggerRemoteSpeech = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

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

      // Translate from remote native language to user's native language
      const res = await requestTranslation(
        text,
        remoteParticipant.nativeLanguage,
        localParticipant.nativeLanguage
      );

      const item: SubtitleItem = {
        id: `peer-${Date.now()}`,
        speakerId: remoteParticipant.id,
        speakerName: remoteParticipant.name,
        speakerLocation: remoteParticipant.location,
        originalText: text,
        sourceLang: remoteParticipant.nativeLanguage,
        translatedText: res.translatedText,
        targetLang: localParticipant.nativeLanguage,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        isFinal: true,
      };

      setActiveSubtitle(item);
      setSubtitles((prev) => [item, ...prev]);
      broadcastSubtitle(item);

      if (autoSpeak) {
        speakTranslation(res.translatedText, localParticipant.nativeLanguage);
      }
    },
    [autoSpeak, broadcastSubtitle, remoteParticipant, localParticipant]
  );

  // Handle local user speaking
  const triggerLocalSpeech = useCallback(
    async (text: string) => {
      await injectUtterance(text);
    },
    [injectUtterance]
  );

  // Layout toggle handler
  const handleToggleLayout = () => {
    setViewLayout((prev) => (prev === "split" ? "remote-focus" : "split"));
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
        currentUser={currentUser}
        onLogout={handleLogout}
        onSwitchUserPrompt={handleSwitchAccount}
      />

      {/* Main Video Call Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 flex flex-col justify-between gap-4">
        {/* Call Info & Perspective Alert Banner */}
        <div
          className={`flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl border text-xs backdrop-blur-md transition-all ${
            isDark
              ? "bg-slate-900/60 border-slate-800 text-slate-300"
              : "bg-white/80 border-slate-200 text-slate-700 shadow-2xs"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">Llamada en curso: {formatTimer(callSeconds)}</span>
            <span className="opacity-40">•</span>
            <span className="text-slate-400">
              {connectionState.peerConnected ? "🟢 Conectados en Tiempo Real" : "🟡 Esperando a tu compañera"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Status of Permissions */}
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Camera className={`w-3.5 h-3.5 ${permissions.camera === "granted" ? "text-emerald-400" : "text-amber-400"}`} />
                Cámara
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Mic className={`w-3.5 h-3.5 ${permissions.microphone === "granted" ? "text-emerald-400" : "text-amber-400"}`} />
                Micrófono
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className={`w-3.5 h-3.5 ${permissions.location === "granted" ? "text-emerald-400" : "text-amber-400"}`} />
                {currentUser?.city || "GPS"}
              </span>
            </div>

            <button
              id="switch-role-btn"
              type="button"
              onClick={handleSwitchAccount}
              className={`px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 transition-all ${
                currentUser?.role === "colombia"
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25"
                  : "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25"
              }`}
              title="Cambiar entre la cuenta de Colombia y la de Boston"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>
                {currentUser?.role === "boston"
                  ? "Conectado como Boston 🇺🇸 (Inglés ⇄ Español)"
                  : "Conectado como Colombia 🇨🇴 (Español ⇄ Inglés)"}
              </span>
            </button>
          </div>
        </div>

        {/* AI Live Listening Banner: Shows continuous auto-translation status */}
        <div
          id="ai-listening-status-banner"
          className={`px-4 py-2.5 rounded-2xl border flex flex-wrap items-center justify-between gap-2 transition-all duration-300 ${
            isListening
              ? aiStatus === "analyzing"
                ? "bg-indigo-950/40 border-indigo-500/40 text-indigo-200"
                : "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
              : isDark
              ? "bg-slate-900/40 border-slate-800 text-slate-400"
              : "bg-slate-100 border-slate-200 text-slate-600"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <span
                className={`w-3 h-3 rounded-full ${
                  isListening
                    ? aiStatus === "analyzing"
                      ? "bg-amber-400 animate-ping"
                      : "bg-emerald-400 animate-pulse"
                    : "bg-slate-500"
                }`}
              />
              <Sparkles className="w-4 h-4 text-amber-300 ml-1.5" />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs">
              <span className="font-bold text-slate-100 flex items-center gap-1.5">
                <span>IA Gemini:</span>
                <span className={isListening ? "text-emerald-400" : "text-slate-400"}>
                  {isListening
                    ? aiStatus === "analyzing"
                      ? "⚡ Escuchando y traduciendo en tiempo real..."
                      : "🟢 Escucha Activa Conectada"
                    : "⚪ Escucha en Pausa"}
                </span>
              </span>
              <span className="text-[11px] text-slate-400">
                {isListening
                  ? interimText
                    ? `Detectando voz: "${interimText}"`
                    : aiStatusMessage || "Habla con normalidad al micrófono; la IA traduce cada frase al instante."
                  : "Presiona 'Conectar Escucha IA' para que el micrófono traduzca automáticamente lo que hables."}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isListening && (
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-[10px] font-mono"
                title={`Sensibilidad de voz detectada: ${audioInputLevel}%`}
              >
                <span className="text-slate-400">Mic VAD:</span>
                <span
                  className={`font-bold ${
                    audioInputLevel > 15 ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  {audioInputLevel}%
                </span>
              </div>
            )}

            <button
              id="banner-toggle-listening-btn"
              type="button"
              onClick={toggleListening}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                isListening
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs"
              }`}
            >
              {isListening ? "Pausar Escucha" : "Activar Escucha"}
            </button>
          </div>
        </div>

        {/* Dual Video Grid Layout */}
        <div
          id="video-stage-container"
          className={`w-full flex-1 grid gap-4 transition-all duration-300 ${
            viewLayout === "split"
              ? "grid-cols-1 md:grid-cols-2"
              : "grid-cols-1"
          }`}
        >
          {/* User Video Feed (Local) */}
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

          {/* Peer Video Feed (Remote - Boston or Colombia) */}
          <div className="w-full h-full">
            <VideoFeed
              participant={remoteParticipant}
              stream={remoteStream}
              isLocal={false}
              activeSubtitle={activeSubtitle}
              theme={theme}
              isSimulated={!connectionState.peerConnected}
              isPeerOnline={connectionState.peerConnected}
              onSimulatedSpeak={() =>
                triggerRemoteSpeech(
                  currentUser?.role === "boston"
                    ? "¡Hola! Qué gusto saludarte hoy desde Colombia."
                    : "Hey! It's so wonderful to talk to you today!"
                )
              }
              captionFontSize={captionFontSize}
            />
          </div>
        </div>

        {/* Interactive Quick Phrase & Speech Simulator Bar */}
        <QuickPhraseBar
          theme={theme}
          onSendLocalPhrase={triggerLocalSpeech}
          onSendRemotePhrase={triggerRemoteSpeech}
          isTranslating={isTranslating}
        />

        {/* Sticky Lower Call Controls Bar */}
        <CallControls
          theme={theme}
          isMicMuted={isMicMuted}
          isVideoOff={!isCameraActive}
          isListening={isListening}
          isScreenSharing={isScreenSharing}
          viewLayout={viewLayout}
          onToggleMic={toggleMic}
          onToggleVideo={toggleCamera}
          onToggleListening={toggleListening}
          onToggleScreenShare={toggleScreenShare}
          onToggleLayout={handleToggleLayout}
          onEndCall={() => setIsCallActive(false)}
        />
      </main>

      {/* Transcript History Drawer */}
      <TranscriptDrawer
        isOpen={isTranscriptOpen}
        onClose={() => setIsTranscriptOpen(false)}
        subtitles={subtitles}
        onClear={() => setSubtitles([])}
        theme={theme}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        captionFontSize={captionFontSize}
        onChangeCaptionFontSize={setCaptionFontSize}
        autoSpeak={autoSpeak}
        onToggleAutoSpeak={() => setAutoSpeak((v) => !v)}
        tone={translationTone}
        onChangeTone={setTranslationTone}
        theme={theme}
      />

      {/* Login & User Management Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onLoginSuccess={handleLoginSuccess}
        isDark={isDark}
      />

      {/* Camera, Microphone and Location Permissions Modal */}
      <PermissionRequestModal
        isOpen={isPermissionModalOpen}
        permissions={permissions}
        onRequestPermissions={handleGrantPermissions}
        onSkip={() => setIsPermissionModalOpen(false)}
        isDark={isDark}
      />
    </div>
  );
}
