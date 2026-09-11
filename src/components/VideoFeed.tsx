import React, { useRef, useEffect } from "react";
import { Mic, MicOff, Video, VideoOff, Volume2, Sparkles, MapPin } from "lucide-react";
import { Participant, SubtitleItem, AppTheme } from "../types";
import { CaptionBanner } from "./CaptionBanner";

interface VideoFeedProps {
  participant: Participant;
  stream: MediaStream | null;
  isLocal: boolean;
  activeSubtitle: SubtitleItem | null;
  interimText?: string;
  theme: AppTheme;
  isSimulated?: boolean;
  onSimulatedSpeak?: () => void;
  captionFontSize?: "sm" | "base" | "lg" | "xl";
}

export const VideoFeed: React.FC<VideoFeedProps> = ({
  participant,
  stream,
  isLocal,
  activeSubtitle,
  interimText,
  theme,
  isSimulated = false,
  captionFontSize = "base",
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isDark = theme === "dark";

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasSubtitleForThisFeed =
    activeSubtitle?.speakerId === participant.id ||
    (isLocal && activeSubtitle?.speakerId === "local-colombia") ||
    (!isLocal && activeSubtitle?.speakerId === "remote-boston");

  return (
    <div
      id={`video-feed-${participant.id}`}
      className={`relative w-full h-full min-h-[320px] sm:min-h-[400px] rounded-3xl overflow-hidden border transition-all duration-300 flex flex-col justify-between shadow-lg ${
        participant.isSpeaking
          ? "border-amber-400/80 shadow-amber-500/20 ring-2 ring-amber-400/40"
          : isDark
          ? "border-slate-800 bg-slate-900"
          : "border-slate-200 bg-slate-100 shadow-slate-200/60"
      }`}
    >
      {/* Video element or Simulated Canvas / Fallback */}
      <div className="absolute inset-0 w-full h-full overflow-hidden bg-slate-950">
        {stream && !participant.isVideoOff ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className={`w-full h-full object-cover ${
              isLocal ? "scale-x-[-1]" : ""
            }`}
          />
        ) : isSimulated ? (
          // Simulated Boston Friend video screen with ambient motion
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-indigo-950/80 to-slate-950">
            {/* Ambient Boston skyline subtle backdrop */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-400 via-slate-800 to-transparent" />

            {/* Avatar with speaking wave aura */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative">
                {participant.isSpeaking && (
                  <>
                    <span className="absolute -inset-3 rounded-full bg-indigo-500/30 animate-ping" />
                    <span className="absolute -inset-2 rounded-full bg-amber-500/20 animate-pulse" />
                  </>
                )}
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-indigo-400/60 overflow-hidden shadow-2xl bg-gradient-to-tr from-rose-400 via-purple-500 to-indigo-500 flex items-center justify-center text-white text-3xl font-bold">
                  {participant.avatarUrl ? (
                    <img
                      src={participant.avatarUrl}
                      alt={participant.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{participant.name.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>

                {/* Country flag bubble */}
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-base shadow-md">
                  {participant.countryCode === "US" ? "🇺🇸" : "🇨🇴"}
                </div>
              </div>

              <div className="mt-4 text-center z-10">
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center justify-center gap-1.5">
                  {participant.name}
                </h3>
                <p className="text-xs text-indigo-300/90 font-medium">
                  {participant.city}, {participant.location}
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Camera disabled / loading placeholder
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center mb-3">
              <VideoOff className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-sm font-semibold text-slate-300">{participant.name}</p>
            <p className="text-xs text-slate-500 mt-1">Cámara desactivada</p>
          </div>
        )}
      </div>

      {/* Top Overlay: Name, Location, and Status Badges */}
      <div className="relative z-10 p-3 sm:p-4 flex items-center justify-between gap-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* User identification badge */}
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/80 shadow-xs">
          <span className="text-sm">
            {participant.countryCode === "US" ? "🇺🇸" : "🇨🇴"}
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white leading-none">
              {participant.name} {isLocal && "(Tú)"}
            </span>
            <span className="text-[10px] text-slate-300 leading-none mt-0.5">
              {participant.city} · {participant.nativeLanguage === "es" ? "Español" : "Inglés"}
            </span>
          </div>
        </div>

        {/* Audio activity equalizer and status icons */}
        <div className="flex items-center gap-2">
          {/* 5-bar live equalizer */}
          <div
            className={`flex items-end gap-0.5 px-2 py-1.5 rounded-full backdrop-blur-md border ${
              participant.isSpeaking
                ? "bg-amber-500/20 border-amber-400/50"
                : "bg-slate-900/70 border-slate-700/70"
            }`}
            title={`Nivel de audio: ${participant.audioLevel}%`}
          >
            {[1, 2, 3, 4, 5].map((bar) => {
              const active =
                participant.isSpeaking &&
                participant.audioLevel > bar * 15;
              return (
                <span
                  key={bar}
                  className={`w-1 rounded-full transition-all duration-100 ${
                    active
                      ? "bg-amber-400 h-4"
                      : "bg-slate-500 h-1.5 opacity-40"
                  }`}
                  style={{
                    height: active
                      ? `${Math.max(6, (participant.audioLevel / 100) * 16 + bar * 2)}px`
                      : "4px",
                  }}
                />
              );
            })}
          </div>

          {/* Mic status indicator */}
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md border ${
              participant.isMuted
                ? "bg-rose-500/20 border-rose-500/50 text-rose-400"
                : "bg-slate-900/80 border-slate-700 text-slate-300"
            }`}
          >
            {participant.isMuted ? (
              <MicOff className="w-3.5 h-3.5" />
            ) : (
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Overlay: Direct Lower-Third Subtitle & Translation */}
      <div className="relative z-10 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        {hasSubtitleForThisFeed ? (
          <CaptionBanner
            subtitle={activeSubtitle}
            interimText={interimText}
            isSpeaking={participant.isSpeaking}
            theme="dark" // Over video feeds we use dark frosted banner for crisp contrast
            fontSize={captionFontSize}
            showAudioButton={true}
          />
        ) : (
          <div className="px-3 py-2 rounded-xl bg-black/40 backdrop-blur-xs border border-white/10 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>
                Cámara de {participant.city} lista · Reconocimiento instantáneo
              </span>
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              HD 1080p
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
