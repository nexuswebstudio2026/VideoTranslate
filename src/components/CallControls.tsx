import React from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  Volume2,
  VolumeX,
  Columns2,
  Maximize2,
  PhoneOff,
  RefreshCw,
  Sparkles,
  Layers,
  Languages,
} from "lucide-react";
import { AppTheme, ViewLayout } from "../types";

interface CallControlsProps {
  theme: AppTheme;
  isMicMuted: boolean;
  isVideoOff: boolean;
  isListening: boolean;
  isScreenSharing: boolean;
  autoSpeak: boolean;
  viewLayout: ViewLayout;
  currentPerspective: "colombia" | "boston";
  aiStatus?: "idle" | "listening" | "analyzing" | "translated";
  aiStatusMessage?: string;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleListening: () => void;
  onToggleScreenShare: () => void;
  onToggleAutoSpeak: () => void;
  onToggleLayout: () => void;
  onTogglePerspective: () => void;
  onEndCall: () => void;
  onRestartDevices: () => void;
}

export const CallControls: React.FC<CallControlsProps> = ({
  theme,
  isMicMuted,
  isVideoOff,
  isListening,
  isScreenSharing,
  autoSpeak,
  viewLayout,
  currentPerspective,
  aiStatus = "idle",
  aiStatusMessage = "",
  onToggleMic,
  onToggleVideo,
  onToggleListening,
  onToggleScreenShare,
  onToggleAutoSpeak,
  onToggleLayout,
  onTogglePerspective,
  onEndCall,
  onRestartDevices,
}) => {
  const isDark = theme === "dark";

  return (
    <div
      id="call-controls-bar"
      className={`w-full max-w-4xl mx-auto p-3 sm:p-4 rounded-3xl border transition-all duration-300 flex flex-wrap items-center justify-center sm:justify-between gap-3 shadow-xl backdrop-blur-md ${
        isDark
          ? "bg-slate-950/90 border-slate-800 text-slate-100"
          : "bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/70"
      }`}
    >
      {/* Left Group: Primary Audio/Video toggles */}
      <div className="flex items-center gap-2">
        {/* Mic Toggle */}
        <button
          id="toggle-mic-btn"
          onClick={onToggleMic}
          className={`p-3 rounded-2xl flex items-center justify-center transition-all ${
            isMicMuted
              ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30"
              : isDark
              ? "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700"
              : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300"
          }`}
          title={isMicMuted ? "Activar micrófono" : "Silenciar micrófono"}
        >
          {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Video Camera Toggle */}
        <button
          id="toggle-video-btn"
          onClick={onToggleVideo}
          className={`p-3 rounded-2xl flex items-center justify-center transition-all ${
            isVideoOff
              ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30"
              : isDark
              ? "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700"
              : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300"
          }`}
          title={isVideoOff ? "Activar cámara" : "Desactivar cámara"}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* Live Speech Recognition & Instant Translation Mic */}
        <button
          id="toggle-live-recognition-btn"
          onClick={onToggleListening}
          className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 font-semibold text-xs sm:text-sm transition-all shadow-md ${
            isListening
              ? aiStatus === "analyzing"
                ? "bg-gradient-to-r from-amber-600 to-indigo-600 text-white ring-2 ring-amber-400/50 animate-pulse"
                : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white ring-2 ring-emerald-400/50"
              : isDark
              ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
          }`}
          title="Activar reconocimiento de voz y subtítulos automáticos en vivo con IA"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: "4s" }} />
          <div className="flex flex-col text-left">
            <span className="hidden sm:inline leading-none font-bold">
              {isListening
                ? aiStatus === "analyzing"
                  ? "IA Gemini Traduciendo..."
                  : "IA Escuchando en Vivo"
                : "Conectar Escucha IA"}
            </span>
            <span className="sm:hidden leading-none font-bold">{isListening ? "IA Activa" : "Escuchar"}</span>
            {isListening && (
              <span className="text-[9px] text-emerald-100/90 leading-none mt-0.5 hidden md:inline">
                {aiStatusMessage || "Traducción automática"}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Center Group: Assistant Features (TTS, Screen Share, Perspective) */}
      <div className="flex items-center gap-2">
        {/* Auto Speak TTS toggle */}
        <button
          id="toggle-auto-speak-btn"
          onClick={onToggleAutoSpeak}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-medium transition-all ${
            autoSpeak
              ? "bg-indigo-600 text-white shadow-xs"
              : isDark
              ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
          }`}
          title="Voz artificial que lee la traducción en voz alta"
        >
          {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 opacity-70" />}
          <span className="hidden md:inline">Voz Traducida</span>
        </button>

        {/* Screen Share */}
        <button
          id="toggle-screen-share-btn"
          onClick={onToggleScreenShare}
          className={`p-3 rounded-2xl flex items-center justify-center transition-all ${
            isScreenSharing
              ? "bg-indigo-600 text-white"
              : isDark
              ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
          }`}
          title="Compartir pantalla"
        >
          <ScreenShare className="w-4 h-4" />
        </button>

        {/* Perspective toggle (View as Colombia vs View as Boston) */}
        <button
          id="toggle-perspective-btn"
          onClick={onTogglePerspective}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold transition-all border ${
            currentPerspective === "colombia"
              ? "bg-amber-500/15 border-amber-400/40 text-amber-300"
              : "bg-indigo-500/15 border-indigo-400/40 text-indigo-300"
          }`}
          title="Cambiar perspectiva para ver qué ve tu amiga en Boston vs qué ves tú en Colombia"
        >
          <Languages className="w-4 h-4" />
          <span>
            {currentPerspective === "colombia" ? "Vista Colombia 🇨🇴" : "Vista Boston 🇺🇸"}
          </span>
        </button>

        {/* Layout toggle */}
        <button
          id="toggle-layout-btn"
          onClick={onToggleLayout}
          className={`p-3 rounded-2xl flex items-center justify-center transition-all ${
            isDark
              ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
          }`}
          title="Cambiar distribución de video (Dividido / Enfoque)"
        >
          <Columns2 className="w-4 h-4" />
        </button>
      </div>

      {/* Right Group: Reconnect and Hang Up */}
      <div className="flex items-center gap-2">
        <button
          id="reconnect-devices-btn"
          onClick={onRestartDevices}
          className={`p-3 rounded-2xl flex items-center justify-center transition-all ${
            isDark
              ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
          }`}
          title="Reiniciar cámaras y micrófono"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* End Call */}
        <button
          id="end-call-btn"
          onClick={onEndCall}
          className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all active:scale-95"
          title="Finalizar llamada"
        >
          <PhoneOff className="w-4 h-4" />
          <span className="hidden sm:inline">Colgar</span>
        </button>
      </div>
    </div>
  );
};
